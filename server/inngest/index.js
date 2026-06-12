import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

export const inngest = new Inngest({ id: "project-management" });

const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      },
    });
  },
);

const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;
    try {
      await prisma.user.delete({
        where: {
          id: data.id,
        },
      });
    } catch (error) {
      if (error.code === "P2025") {
        console.log("User already deleted or never existed. Ignoring.");
        return; // Safely ignore
      }
      throw error;
    }
  },
);

const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    const { data } = event;
    try {
      await prisma.user.update({
        where: {
          id: data.id,
        },
        data: {
          email: data?.email_addresses[0]?.email_address,
          name: data?.first_name + " " + data?.last_name,
          image: data?.image_url,
        },
      });
    } catch (error) {
      if (error.code === "P2025") {
        console.log(
          "User update arrived before creation. Telling Inngest to retry...",
        );
        throw new Error("Retrying user update"); // Force a retry
      }
      throw error;
    }
  },
);

const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.created" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  },
);

const syncWorkspaceUpdation = inngest.createFunction(
  {
    id: "update-workspace-from-clerk",
    triggers: [{ event: "clerk/organization.updated" }],
  },
  async ({ event }) => {
    const { data } = event;
    try {
      await prisma.workspace.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          slug: data.slug,
          image_url: data.image_url,
        },
      });
    } catch (error) {
      if (error.code === "P2025") {
        console.log(
          "Workspace update arrived before creation. Telling Inngest to retry...",
        );
        throw new Error("Retrying workspace update");
      }
      throw error;
    }
  },
);

const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "delete-workspace-with-clerk",
    triggers: [{ event: "clerk/organization.deleted" }],
  },
  async ({ event }) => {
    const { data } = event;
    try {
      await prisma.workspace.delete({
        where: {
          id: data.id,
        },
      });
    } catch (error) {
      if (error.code === "P2025") {
        console.log("Workspace already deleted or never existed. Ignoring.");
        return;
      }
      throw error;
    }
  },
);

const syncworkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-from-clerk",
    triggers: [{ event: "clerk/organizationInvitation.accepted" }],
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role).toUpperCase(),
      },
    });
  },
);



const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: [{ event: "app/task.assigned" }],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    // ✅ Bug 3 fixed - wrapped in step.run
    await step.run("send-assignment-email", async () => {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignee: true, project: true },
      });

      await sendEmail({
        to: task.assignee.email,
        subject: `New Task Assignment in ${task.project.name}`,
        body: `<div style="max-width: 600px;">
          <h2>Hi ${task.assignee.name}, 👋</h2>
          <p style="font-size: 16px;">You've been assigned a new task:</p>
          <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
          <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
            <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
          </div>
          <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">View Task</a>
          <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">Please make sure to review and complete it before the due date.</p>
        </div>`,
      });
    });

    // Sleep until due date
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return;

    if (new Date(task.due_date).toDateString() !== new Date().toDateString()) {
      await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));

      // ✅ Bug 2 fixed - flat step, not nested
      await step.run("send-task-reminder-mail", async () => {
        const updatedTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });

        if (!updatedTask || updatedTask.status === "DONE") return;

        await sendEmail({
          to: updatedTask.assignee.email,
          subject: `Reminder for ${updatedTask.project.name}`,
          body: `<div style="max-width: 600px;">
            <h2>Hi ${updatedTask.assignee.name}, 👋</h2>
            <p style="font-size: 16px;">You have a task due in ${updatedTask.project.name}:</p>
            <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${updatedTask.title}</p>
            <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
              <p style="margin: 6px 0;"><strong>Description:</strong> ${updatedTask.description}</p>
              <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(updatedTask.due_date).toLocaleDateString()}</p>
            </div>
            <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">View Task</a>
            <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">Please make sure to review and complete it before the due date.</p>
          </div>`,
        });
      });
    }
  },
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncworkspaceMemberCreation,
  sendTaskAssignmentEmail,
];

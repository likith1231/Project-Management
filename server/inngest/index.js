import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
// import { Prisma } from "@prisma/client";
// import e from "express";

export const inngest = new Inngest({ id: "project-management" });

const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: [{ event: "clerk/user.created" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.create({
            data: {
                id: data.id,
                email: data?.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        });
    }
);

const syncUserDeletion = inngest.createFunction(
    {
        id: "delete-user-with-clerk",
        triggers: [{ event: "clerk/user.deleted" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.delete({
            where: {
                id: data.id,
            }
        });
    }
);

const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: [{ event: "clerk/user.updated" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.update({
            where: {
                id: data.id
            },
            data: {
                email: data?.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        });
    }
);

const syncWorkspaceCreation = inngest.createFunction(
    {
        id: "sync-workspace-from-clerk",
        triggers: [{ event: "clerk/organization.created" }]
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
            }
        });
        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN"
            }
        });
    }
);

const syncWorkspaceUpdation = inngest.createFunction(
    {
        id: "update-workspace-from-clerk",
        triggers: [{ event: "clerk/organization.updated" }]
    },
    async ({ event }) => {
        const { data } = event;
        
        try {
            await prisma.workspace.update({
                where: {
                    id: data.id
                },
                data: {
                    name: data.name,
                    slug: data.slug,
                    image_url: data.image_url,
                }
            });
        } catch (error) {
            // Catch the specific Prisma "Record not found" error
            if (error.code === 'P2025') {
                console.log("Workspace update arrived before creation. Telling Inngest to retry...");
                // Throwing a standard error tells Inngest to put it back in the queue and try again later
                throw new Error("Retrying workspace update");
            }
            // If it is any other error, throw it normally
            throw error;
        }
    }
);

const syncWorkspaceDeletion = inngest.createFunction(
    {
        id: "delete-workspace-with-clerk",
        triggers: [{ event: "clerk/organization.deleted" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.delete({
            where: {
                id: data.id
            }
        });
    }
);

const syncworkspaceMemberCreation = inngest.createFunction(
    {
        id: "sync-workspace-member-from-clerk",
        triggers: [{ event: "clerk/organizationInvitation.accepted" }]
    },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspaceMember.create({
            data: {
                userId: data.user_id,
                workspaceId: data.organization_id,
                role: String(data.role).toUpperCase()
            }
        });
    }
);

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceUpdation,
    syncWorkspaceDeletion,
    syncworkspaceMemberCreation
];
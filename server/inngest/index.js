import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

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
        try {
            await prisma.user.delete({
                where: {
                    id: data.id,
                }
            });
        } catch (error) {
            if (error.code === 'P2025') {
                console.log("User already deleted or never existed. Ignoring.");
                return; // Safely ignore
            }
            throw error;
        }
    }
);

const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: [{ event: "clerk/user.updated" }]
    },
    async ({ event }) => {
        const { data } = event;
        try {
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
        } catch (error) {
            if (error.code === 'P2025') {
                console.log("User update arrived before creation. Telling Inngest to retry...");
                throw new Error("Retrying user update"); // Force a retry
            }
            throw error;
        }
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
            if (error.code === 'P2025') {
                console.log("Workspace update arrived before creation. Telling Inngest to retry...");
                throw new Error("Retrying workspace update");
            }
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
        try {
            await prisma.workspace.delete({
                where: {
                    id: data.id
                }
            });
        } catch (error) {
            if (error.code === 'P2025') {
                console.log("Workspace already deleted or never existed. Ignoring.");
                return; 
            }
            throw error; 
        }
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
import prisma from '../configs/prisma.js';

export const getUserWorkspaces = async (req, res) => {
    try {
        console.log("REQ AUTH:", req.auth);
        
        const auth = req.auth;
        const userId = auth?.userId;
        const orgId = auth?.orgId;

        console.log("BACKEND AUTH:", { userId, orgId, sessionStatus: auth?.sessionStatus });

        // Try to find workspaces - first by userId, then by orgId
        let workspaces = [];

        if (userId) {
            // Standard: find workspaces where user is a member
            workspaces = await prisma.workspace.findMany({
                where: {
                    members: { some: { userId: userId } }
                },
                include: {
                    members: { include: { user: true } },
                    projects: {
                        include:{
                            tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                            members: { include: { user: true } }
                        }
                    },
                    owner: true
                }
            });
            console.log(`✅ Found ${workspaces.length} workspaces for userId: ${userId}`);
        } 
        else if (orgId) {
            // Fallback: find workspace by orgId (newly created org might only have orgId)
            workspaces = await prisma.workspace.findMany({
                where: {
                    id: orgId
                },
                include: {
                    members: { include: { user: true } },
                    projects: {
                        include:{
                            tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                            members: { include: { user: true } }
                        }
                    },
                    owner: true
                }
            });
            console.log(`⚠️ Found ${workspaces.length} workspaces for orgId: ${orgId}`);
        }
        else {
            console.warn("❌ No userId or orgId in auth context");
            return res.status(401).json({ message: "Unauthorized: No user context" });
        }

        res.status(200).json({ workspaces });

    } catch (error) {
        console.error("GET WORKSPACES ERROR:", error);
        res.status(500).json({ message: error.code || error.message });
    }
};

export const addMember = async (req, res) => {
    try {
        // FIX: Applied the same fix here so adding members doesn't crash later!
        const userId = req.auth.userId; 
        const { email, role, workspaceId, message } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!workspaceId || !role) {
             return res.status(400).json({ message: "Missing required parameters" }); // Changed to 400 (Bad Request)
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const workspace = await prisma.workspace.findUnique({ 
            where: { id: workspaceId },
            include: { members: true } 
        });
        
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        if (!workspace.members.find(member => member.userId === userId && member.role === "ADMIN")) {
            return res.status(401).json({ message: "You do not have admin privileges" });
        }

        const existingMember = workspace.members.find((member) => member.userId === user.id);
        if (existingMember) {
            return res.status(400).json({ message: "User is already a member" });
        }

        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message
            }
        });

        res.status(200).json({ member, message: "Member added successfully"});

    } catch (error) {
        console.error("ADD MEMBER ERROR:", error);
        res.status(500).json({ message: error.code || error.message });
    }   
};
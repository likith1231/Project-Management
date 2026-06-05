export const getUserWorkspaces = async (req, res) => {
    try {
        // FIX: req.auth is an object in Express, not a function!
        const userId = req.auth.userId; 

        // X-Ray Vision: This will print in your VS Code backend terminal
        console.log("BACKEND DETECTED USER ID:", userId);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No User ID found" });
        }

        const workspaces = await prisma.workspace.findMany({
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

        console.log(`SUCCESS: Found ${workspaces.length} workspaces for user.`);
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
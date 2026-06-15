import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { dummyWorkspaces } from "../assets/assets";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk(
  "workspace/fetchWorkspaces",
  async ({ getToken }) => {
    try {
      if (!getToken) {
        console.error("ERROR: getToken function not provided");
        return [];
      }

       const token = await getToken({ skipCache: true });

      console.log("========== TOKEN DEBUG ==========");
      console.log("TOKEN:", token);
      console.log("TOKEN LENGTH:", token?.length);
      console.log("=================================");

      if (!token) {
        console.error("ERROR: getToken() returned null/undefined");
        return [];
      }

      console.log("✅ Got token, fetching workspaces...");
      const { data } = await api.get("/api/workspaces", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✅ Workspaces fetched successfully:", data);
      return data.workspaces || [];
    } catch (error) {
      console.error(
        "❌ FETCH ERROR:",
        error?.response?.data?.message || error.message,
      );
      console.error("Full error:", error?.response?.data);
      return [];
    }
  },
);

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },
    setCurrentWorkspace: (state, action) => {
      localStorage.setItem("currentWorkspaceId", action.payload);
      state.currentWorkspace = state.workspaces.find(
        (w) => w.id === action.payload,
      );
    },
    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);

      // set current workspace to the new workspace
      if (state.currentWorkspace?.id !== action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },
    updateWorkspace: (state, action) => {
      state.workspaces = state.workspaces.map((w) =>
        w.id === action.payload.id ? action.payload : w,
      );

      // if current workspace is updated, set it to the updated workspace
      if (state.currentWorkspace?.id === action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },
    deleteWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter(
        (w) => w._id !== action.payload,
      );
    },
    addProject: (state, action) => {
      state.currentWorkspace.projects.push(action.payload);
      // find workspace by id and add project to it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? { ...w, projects: w.projects.concat(action.payload) }
          : w,
      );
    },
    addTask: (state, action) => {
      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) => {
          console.log(
            p.id,
            action.payload.projectId,
            p.id === action.payload.projectId,
          );
          if (p.id === action.payload.projectId) {
            p.tasks.push(action.payload);
          }
          return p;
        },
      );

      // find workspace and project by id and add task to it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? { ...p, tasks: p.tasks.concat(action.payload) }
                  : p,
              ),
            }
          : w,
      );
    },
    updateTask: (state, action) => {
      state.currentWorkspace.projects.map((p) => {
        if (p.id === action.payload.projectId) {
          p.tasks = p.tasks.map((t) =>
            t.id === action.payload.id ? action.payload : t,
          );
        }
      });
      // find workspace and project by id and update task in it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t,
                      ),
                    }
                  : p,
              ),
            }
          : w,
      );
    },
    deleteTask: (state, action) => {
      state.currentWorkspace.projects.map((p) => {
        p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
        return p;
      });
      // find workspace and project by id and delete task from it
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.filter(
                        (t) => !action.payload.includes(t.id),
                      ),
                    }
                  : p,
              ),
            }
          : w,
      );
    },
  },
  extraReducers: (builder) => {
  builder.addCase(fetchWorkspaces.pending, (state) => {
    state.loading = true;
  });
  builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
    state.workspaces = action.payload;
    if (action.payload.length > 0) {
      const savedId = localStorage.getItem("currentWorkspaceId");
      if (savedId) {
        const found = action.payload.find((w) => w.id === savedId);
        state.currentWorkspace = found || action.payload[0];
      } else {
        state.currentWorkspace = action.payload[0];
      }
    }
    state.loading = false;
  });
  builder.addCase(fetchWorkspaces.rejected, (state) => {
    state.loading = false;
  });
},
});

export const {
  setWorkspaces,
  setCurrentWorkspace,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addProject,
  addTask,
  updateTask,
  deleteTask,
} = workspaceSlice.actions;
export default workspaceSlice.reducer;

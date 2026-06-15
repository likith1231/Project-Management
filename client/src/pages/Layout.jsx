import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet,Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, useAuth, CreateOrganization, useOrganizationList } from '@clerk/react'
import { fetchWorkspaces } from '../features/workspaceSlice'

// ✅ Move ref OUTSIDE component so it never resets on re-render
let globalFetchDone = false;

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken, isSignedIn, isLoaded: isAuthLoaded } = useAuth()

    const { userMemberships, isLoaded: isOrgLoaded } = useOrganizationList({
        userMemberships: !!isSignedIn,
    })

    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    useEffect(() => {
        // ✅ All conditions must be true, and only fetch once globally
        const shouldFetch =
            isLoaded &&
            isAuthLoaded &&
            isSignedIn &&
            isOrgLoaded &&
            userMemberships?.data?.length > 0 &&
            workspaces.length === 0 &&
            !loading &&
            !globalFetchDone

        if (shouldFetch) {
            globalFetchDone = true
            console.log("🚀 Fetching workspaces - one time only")
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [
        isLoaded,
        isAuthLoaded, 
        isSignedIn,
        isOrgLoaded,
        userMemberships?.data?.length,
        workspaces.length,
        loading,
        dispatch,
        getToken
    ])

    // Step 1: Clerk initializing
    if (!isLoaded || !isAuthLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    // Step 2: Not signed in
    if (!isSignedIn || !user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                return <Navigate to="/sign-in" replace /> 
            </div>
        )
    }

    // Step 3: Waiting for org list
    if (!isOrgLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    // Step 4: No orgs
    if (userMemberships?.data?.length === 0) {
        return (
            <div className='min-h-screen flex justify-center items-center'>
                <CreateOrganization afterCreateOrganizationUrl="/" />
            </div>
        )
    }

    // Step 5: Fetching from backend
    if (loading) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    // Step 6: Inngest hasn't synced yet - show syncing screen
    // but DON'T loop - just wait for the single fetch to complete
    // Step 6: Inngest hasn't synced yet
if (workspaces.length === 0) {
    return (
        <div className='flex flex-col items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-10 text-blue-500 animate-spin mb-4" />
            <h2 className="text-xl font-semibold dark:text-white">Syncing Workspace...</h2>
            <p className="text-gray-500 mt-2">Setting up your database securely.</p>
            <button
                onClick={() => {
                    globalFetchDone = false
                    dispatch(fetchWorkspaces({ getToken }))
                }}
                className="mt-6 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Retry
            </button>
        </div>
    )
}

    // Step 7: All good
    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
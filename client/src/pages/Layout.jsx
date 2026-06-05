import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, SignIn, useAuth, CreateOrganization, useOrganizationList } from '@clerk/react' 
import { fetchWorkspaces } from '../features/workspaceSlice'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()
    
    // Grab the live organization data directly from Clerk
    const { userMemberships, isLoaded: isOrgLoaded } = useOrganizationList({
        userMemberships: true,
    })

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Initial fetch from backend
    useEffect(() =>{
        if (isLoaded && user && workspaces.length === 0){
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [isLoaded, user, dispatch, getToken])

    // Smart Polling: Wait for the database to sync with Clerk
    useEffect(() => {
        let timeoutId;

        const checkDatabase = async () => {
            if (userMemberships?.data?.length > 0 && workspaces.length === 0) {
                console.log("Checking database for new workspace...");
                
                await dispatch(fetchWorkspaces({ getToken }));
                
                timeoutId = setTimeout(checkDatabase, 3000);
            }
        };

        if (userMemberships?.data?.length > 0 && workspaces.length === 0) {
            timeoutId = setTimeout(checkDatabase, 2000);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [userMemberships?.data?.length, workspaces.length, dispatch, getToken])

    if (!isLoaded || !isOrgLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user) {
        return(
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'> 
                <SignIn /> 
            </div>
        )
    }

    if (loading && workspaces.length > 0) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    // If Clerk says they have ZERO orgs, show the create form
    if (user && userMemberships?.data?.length === 0) {
        return (
            <div className='min-h-screen flex justify-center items-center'>
                <CreateOrganization afterCreateOrganizationUrl="/" />
            </div>
        )
    }

    // If Clerk says they HAVE an org, but Redux is waiting for Inngest
    if (userMemberships?.data?.length > 0 && workspaces.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-10 text-blue-500 animate-spin mb-4" />
                <h2 className="text-xl font-semibold dark:text-white">Syncing Workspace...</h2>
                <p className="text-gray-500 mt-2">Setting up your database securely.</p>
            </div>
        )
    }

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
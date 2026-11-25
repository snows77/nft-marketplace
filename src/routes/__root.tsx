import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <header className="border-b p-4">NFT Marketplace</header>
      <Outlet />
    </>
  ),
})
export const getActiveModules = () => {
  const modulesRaw = process.env.NEXT_PUBLIC_MODULES || ''
  const modules = modulesRaw.split(',').map(m => m.trim().toLowerCase())

  return {
    adminEnabled: modules.includes('admin'),
    cmsEnabled: modules.includes('cms'),
  }
}

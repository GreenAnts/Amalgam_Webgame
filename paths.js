// Paths.js
export const getProjectRoot = () => {
    const isGitHub = window.location.hostname.includes('github.io');
    // Important: Include the trailing slash
    return isGitHub ? '/Amalgam_Webgame/' : '/'; 
};
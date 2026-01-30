// paths.js - Central path management for deployment
export const getProjectRoot = () => {
    const url = new URL('./', import.meta.url).pathname;
    
    // Handle GitHub Pages deployment vs local
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    if (isGitHubPages) {
        // Adjust for GitHub Pages subdirectory if needed
        // Example: /amalgam/ if repo name is "amalgam"
        const repoName = ''; // Leave empty if deployed to username.github.io
        return repoName ? `/${repoName}/` : '/';
    }
    
    return url;
};

// Helper to get asset paths
export const getAssetPath = (relativePath) => {
    const root = getProjectRoot();
    return `${root}${relativePath}`;
};
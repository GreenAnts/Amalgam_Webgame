// paths.js
export const getProjectRoot = () => {
	return new URL('./', import.meta.url).pathname;
};
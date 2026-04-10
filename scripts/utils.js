const utils = {
    formatFileName: (title) => {
        return title
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .replace(/\s+/g, "_");
    },
    getFileExtension: (language) => {
        const normalized = String(language || "")
            .trim()
            .toLowerCase()
            .replace(/^['\"]+|['\"]+$/g, "")
            .replace(/\s+/g, "");

        const langMap = {
            cpp: "cpp",
            "c++": "cpp",
            c: "c",
            java: "java",
            python: "py",
            python3: "py",
            "python-3": "py",
            javascript: "js",
            typescript: "ts",
            csharp: "cs",
            "c#": "cs",
            golang: "go",
            go: "go",
            rust: "rs",
        };
        return langMap[normalized] || "txt";
    },

    encodeBase64: (str) => {
        return btoa(unescape(encodeURIComponent(str)));
    },
};

export default utils;

const utils = {
  formatFileName: (title) => {
    return title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  },
  getFileExtension: (language) => {
    const langMap = {
      cpp: "cpp",
      java: "java",
      python: "py",
      python3: "py",
      javascript: "js",
      typescript: "ts",
      csharp: "cs",
      golang: "go",
      rust: "rs",
    };
    return langMap[language.toLowerCase()] || "txt";
  },

  encodeBase64: (str) => {
    return btoa(unescape(encodeURIComponent(str)));
  },
};

export default utils;

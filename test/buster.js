var config = module.exports;

config["UIXHR2"] = {
    rootPath: "../",
    environment: "browser", // or "node"
    sources: [
        "test/assets/js/mootools-1.4.5.js",
        "lib/ui.xhr.js"
    ],
    tests: [
        "test/*-test.js"
    ]
};

var config = module.exports;

config["UIXHR2"] = {
    rootPath: "../",
    environment: "browser", // or "node"
    sources: [
        "test/assets/js/*.js",
        "lib/*.js"
    ],
    tests: [
        "test/*-test.js"
    ]
};

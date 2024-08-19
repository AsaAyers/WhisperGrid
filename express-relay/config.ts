const path = require("path");

const config = {
  ROOT_DIR: __dirname,
  URL_PORT: 9001,
  URL_PATH: "http://localhost:9001",
  BASE_VERSION: "",
  CONTROLLER_DIRECTORY: path.join(__dirname, "controllers"),
  PROJECT_DIR: __dirname,
  SERVER_SECRET: "e20467e2a49ae46d7501980f848554c4",

  OPENAPI_YAML: "",
  FULL_PATH: "",
  FILE_UPLOAD_PATH: "",
};
config.OPENAPI_YAML = path.join(config.ROOT_DIR, "api", "openapi.yaml");
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, "uploaded_files");

export default config;

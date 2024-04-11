const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const ejs = require('ejs');
const app = express();
const port = 6969;
let db;
let Folder;
mongoose.connect(
  "mongodb://127.0.0.1:27017/yourDatabaseName?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.3"
)
.then(() => {
  console.log("Connected to MongoDB");
  db = mongoose.connection;
})
.catch((error) => {
  console.error("Error connecting to MongoDB: ", error);
});
const FolderSchema = new mongoose.Schema({
  id: String,
  path: String,
  subfolders: [
    {
      id: String,
      subfolderPath: String,
      views: { type: Number, default: 0 },
    },
  ],
});
Folder = mongoose.model("Folder", FolderSchema);
async function addTodb(folder) {
    const newFolder = new Folder(folder);
    try {
      await newFolder.save();
      console.log("Folder saved successfully");
    } catch (error) {
      console.error("Error saving folder: ", error);
    }
  }
  /*
function createViewsTree(dirPath, title) {
  const data = fs
    .readdirSync(dirPath)
    .filter((name) => fs.statSync(path.join(dirPath, name)).isDirectory())
    .map((name) => {
      const filePath = path.join(dirPath, name);
      const subfolders = fs
        .readdirSync(filePath)
        .filter((name) =>
          fs.statSync(path.join(filePath, name)).isDirectory()
        )
        .map((subfolder) => {
          const subfolderPath = path.join(filePath, subfolder);
          return {
            id: subfolder,
            name: subfolder,
            iconSrc: "",
            subfolderPath: subfolderPath,
            views: 0,
          };
        });
      const folder = {
        id: name,
        name: name,
        path: filePath,
        subfolders: subfolders,
      };
      addTodb(folder);
      return folder;
    });
  return { title: title, data: data };
}
*/
function createViewsTree(directory, title) {
    const result = { title: title, data: [] };
  
    const items = fs.readdirSync(directory);
  
    items.forEach(item => {
      const itemPath = path.join(directory, item);
      const isDirectory = fs.statSync(itemPath).isDirectory();
  
      if (isDirectory) {
        const subfolder = {
          id: item,
          name: item,
          path: itemPath,
          iconSrc: '/path/to/icon', // replace with actual path to icon
          subfolders: createViewsTree(itemPath, item).data // recursive call for nested subfolders
        };
  
        result.data.push(subfolder);
      }
    });
  
    return result;
  }
async function readDirectoryTree(location) {
  const tree = {};
  function traverseDirectory(currentPath, currentLevel) {
    const files = fs.readdirSync(currentPath);
    files.forEach((file) => {
      const filePath = path.join(currentPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        const directoryName = path.basename(filePath);
        currentLevel[directoryName] = {};
        traverseDirectory(filePath, currentLevel[directoryName]);
      } else {
        const fileName = path.basename(currentPath);
        currentLevel[fileName] = { URL: "" };
      }
    });
  }
  traverseDirectory(location, tree);
  await db.collection("directoryTree").insertOne(tree);
  console.log("Directory tree inserted into MongoDB");
}
app.use(bodyParser.json());
app.use(express.static("videos"));
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.get("/", async (req, res) => {
  const data = createViewsTree(path.join(__dirname, "views"), "Home");
  console.log(data);
  res.render("layout", {
    folder: null,
    subfolder: null,
    indexPath: null,
    data: data.data,
  });
});
app.post("/submit", async (req, res) => {
  const folder = req.body.folder;
  const fileName = req.body.fileName;
  const url = req.body.url;
  const result = await db
    .collection("directoryTree")
    .findOne({ [folder]: { $exists: true } });
  if (result) {
    result[folder][fileName].URL = url;
    await db
      .collection("directoryTree")
      .updateOne(
        { _id: result._id },
        { $set: { [folder]: result[folder] } }
      );
    res.send("URL added successfully!");
  } else {
    res.status(404).send("Folder not found!");
  }
});
app.get("/sync", async (req, res) => {
    const viewsTree = createViewsTree(path.join(__dirname, "views"), "Home");
      
    console.log(JSON.stringify(viewsTree, null, 2))
  
    res.render("layout", {
      folder: null,
      subfolder: null,
      indexPath: null,
      data: viewsTree.data,
    });
  });
app.get("/:folder/:subfolder?", async (req, res) => {
    const folderName = req.params.folder;
    const subfolderName = req.params.subfolder;
    let indexPath = null;
    let data = createViewsTree(path.join(__dirname, "views"), "Home").data;
    for (let folder of data) {
      if (folder.id === folderName) {
        for (let subfolder of folder.subfolders) {
          if (subfolder.id === subfolderName) {
            data = subfolder;
            break;
          }
        }
      }
    }
    console.log(data);
    res.render("layout", {
      folder: folderName,
      subfolder: subfolderName,
      indexPath: indexPath,
      data: data,
    });
  });
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
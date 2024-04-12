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
  await addTodb(tree); // Use addTodb function to save the tree
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
  const data = await Folder.find({});
  res.render("layout", {
    folder: null,
    subfolder: null,
    indexPath: null,
    data: data,
  });
});

app.get("/submit", async (req, res) => {
    const folders = await Folder.find({});
    res.render("form", { folders });
});

app.post("/submit", async (req, res) => {
  const folder = req.body.folder;
  const fileName = req.body.fileName;
  const url = req.body.url;
  const result = await Folder.findOne({ id: folder }); // Use Folder model to find the folder
  if (result) {
    const subfolder = result.subfolders.find(subfolder => subfolder.id === fileName);
    if (subfolder) {
      subfolder.URL = url;
      await result.save(); // Save the updated document
      res.send("URL added successfully!");
    } else {
      res.status(404).send("File not found!");
    }
  } else {
    res.status(404).send("Folder not found!");
  }
});

app.get("/sync", async (req, res) => {
  const location = req.query.location;
  if (!location) {
    return res.status(400).send("Missing location parameter");
  }
  await readDirectoryTree(location);
  const data = await Folder.find({});
    
  console.log(JSON.stringify(data, null, 2))

  res.render("layout", {
    folder: null,
    subfolder: null,
    indexPath: null,
    data: data,
  });
});

app.get("/:folder/:subfolder?", async (req, res) => {
  const location = req.query.location;
  if (!location) {
    return res.status(400).send("Missing location parameter");
  }
  await readDirectoryTree(location);

  const folderName = req.params.folder;
  const subfolderName = req.params.subfolder;
  let indexPath = null;
  let data = await Folder.findOne({ id: folderName });
  if (data) {
    if (subfolderName) {
      data = data.subfolders.find(subfolder => subfolder.id === subfolderName);
      if (!data) {
        return res.status(404).send("Subfolder not found!");
      }
    }
    res.render("layout", {
      folder: folderName,
      subfolder: subfolderName,
      indexPath: indexPath,
      data: data,
    });
  } else {
    res.status(404).send("Folder not found!");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
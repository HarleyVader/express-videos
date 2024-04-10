const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const app = express();
const port = 6969;

// Define a middleware function for error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Define a middleware function for handling 404 errors
app.use((req, res, next) => {
  res.status(404).send("Page not found!");
});

// Connect to MongoDB
mongoose.connect(
  "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.3"
).then(async () => {
  const db = mongoose.connection;

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

  const Folder = mongoose.model("Folder", FolderSchema);

  async function addTodb(folder) {
    const newFolder = new Folder(folder);
    await newFolder.save();
    console.log("Folder saved successfully");
  }

  // Function to create a tree of the views folder
  function createViewsTree(dirPath, title) {
    const data = fs
      .readdirSync(dirPath)
      .filter((name) => fs.statSync(path.join(dirPath, name)).isDirectory()) // Filter out files
      .map((name) => {
        const filePath = path.join(dirPath, name);
        const subfolders = fs
          .readdirSync(filePath)
          .filter((name) =>
            fs.statSync(path.join(filePath, name)).isDirectory()
          )
          .map((subfolderName) => {
            const subfolderPath = path.join(filePath, subfolderName);
            return {
              id: subfolderName,
              subfolderPath: subfolderPath,
              views: 0,
            };
          });

        const folder = {
          id: name,
          path: filePath,
          subfolders: subfolders,
        };

        addTodb(folder);

        return folder;
      });

    return { title: title, data: data };
  }



  async function addTodb(folder) {
    const newFolder = new Folder(folder);
    await newFolder.save();
    console.log("Folder saved successfully");
  }

  // Function to create a tree of the views folder
  function createViewsTree(dirPath, title) {
    const data = fs
      .readdirSync(dirPath)
      .filter((name) => fs.statSync(path.join(dirPath, name)).isDirectory()) // Filter out files
      .map((name) => {
        const filePath = path.join(dirPath, name);
        const subfolders = fs
          .readdirSync(filePath)
          .filter((name) =>
            fs.statSync(path.join(filePath, name)).isDirectory()
          )
          .map((subfolderName) => {
            const subfolderPath = path.join(filePath, subfolderName);
            return {
              id: subfolderName,
              subfolderPath: subfolderPath,
              views: 0,
            };
          });

        const folder = {
          id: name,
          path: filePath,
          subfolders: subfolders,
        };

        addTodb(folder);

        return folder;
      });

    return { title: title, data: data };
  }

  // Read directory tree and create database
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
          const fileName = path.basename(currentPath); // Use folder name as file name
          currentLevel[fileName] = { URL: "" };
        }
      });
    }

    traverseDirectory(location, tree);

    // Insert tree structure into MongoDB
    await db.collection("directoryTree").insertOne(tree);
    console.log("Directory tree inserted into MongoDB");
  }

  async function renderView(res, folder, subfolder) {
    // Create a variable path
    const path = `${folder}.${subfolder}`;

    // Use the variable path to fetch the correct data from the database
    const result = await db
      .collection("directoryTree")
      .findOne({ [path]: { $exists: true } });

    // Extract the location and counter from the result
    const location = result ? result[folder][subfolder].URL : "";
    const counter = result
      ? Object.keys(result[folder][subfolder]).length
      : 0;

      app.use(bodyParser.json());
      app.use(express.static("public"));
    
      // Set EJS as the view engine
      app.set("view engine", "ejs");
    
      // Set the views directory
      app.set("views", path.join(__dirname, "views"));

      app.get("/", async (req, res) => {
        const data = createViewsTree(path.join(__dirname, "views"), "Home");
        res.render("layout", {
          folderName: null,
          subfolderName: null,
          indexPath: null,
          data: data.data,
        });
      });

    // Render the form with the location and counter
    res.render("form", { location, counter });
  }
    app.post("/submit", async (req, res) => {
      const folderName = req.body.folderName;
      const fileName = req.body.fileName;
      const url = req.body.url;
  
      const result = await db
        .collection("directoryTree")
        .findOne({ [folderName]: { $exists: true } });
  
      if (result) {
        result[folderName][fileName].URL = url;
        await db
          .collection("directoryTree")
          .updateOne(
            { _id: result._id },
            { $set: { [folderName]: result[folderName] } }
          );
        res.send("URL added successfully!");
      } else {
        res.status(404).send("Folder not found!");
      }
    });

  // Create a route handler that reads the tree and fills in the correct storage path
  app.get("/:folder/:subfolder?", async (req, res) => {
    await renderView(res, req.params.folder, req.params.subfolder);
  });

  app.get("/sync", async (req, res) => {
    // Create the views tree
    const viewsTree = createViewsTree(path.join(__dirname, "views"), "Home");
    res.render("layout", {
      folderName: null,
      subfolderName: null,
      indexPath: null,
      data: viewsTree.data,
    });
  });

  app.get("/:folderName/:subfolderName?", async (req, res) => {
    const folderName = req.params.folderName;
    const subfolderName = req.params.subfolderName;
    let indexPath = null;

    // Get the data from the views tree
    let data = createViewsTree(path.join(__dirname, "views"), "Home").data;

    // Find the data for the current folder and subfolder
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

    // Render the layout with the appropriate data
    res.render("layout", {
      folderName: folderName,
      subfolderName: subfolderName,
      indexPath: indexPath,
      data: data,
    });
  });

  // Start the app
  app.listen(port, async () => {
    console.log(`App listening at http://localhost:${port}`);
    await readDirectoryTree("videos"); // Replace with your desired directory location
  });
});


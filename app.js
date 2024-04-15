

// Importing required modules
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// Initializing express app
const app = express();
const port = 6969;

// Setting root directory
const rootDirectory = './views';
console.log(`Root Directory: ${rootDirectory}`);

// Connecting to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.3')
    .catch(err => console.error('MongoDB connection error:', err));

    const folderSchema = new mongoose.Schema({
        name: String,
        path: String,
        url: String,
        views: Number,
    });

// Creating Mongoose model for folders
const Folder = mongoose.model('videoViews', folderSchema);

// Function to add folders to the database recursively
const addFoldersToDatabase = async (rootDirectory) => {
    try {
        // Check the database for identical folders
        const existingFolders = await Folder.find();
        // Add new folders if they are not already in the database
        const newFolders = [];
        // Process the new folders as needed
        const readDirectory = (directory) => {
            const files = fs.readdirSync(directory);
            for (const file of files) {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    const folder = {
                        name: file,
                        path: "/" + path.relative(rootDirectory, filePath),
                        url: ``,
                        views: 0
                    };
                    const existingFolder = existingFolders.find(f => f.name === folder.name && f.path === folder.path);
                    if (!existingFolder) {
                        newFolders.push(folder);
                    }
                    readDirectory(filePath); // Recursively read subfolders
                }
            }
        };
        readDirectory(rootDirectory);
        for (const folder of newFolders) {
            await Folder.create(folder);
            console.log('Added folder:', folder);
        }
        console.log('New folders added to database:', newFolders); // Moved inside the function
    } catch (error) {
        console.error('Error adding folders to database:', error);
    }
};

const addUrlToDb = async (name, url) => {
    // Find a folder with the same name and update its URL
    const updatedFolder = await Folder.findOneAndUpdate({ name }, { url }, { new: true });

    // If no folder was found, create and save a new instance
    if (!updatedFolder) {
        const folder = new Folder({ name, url });
        return folder.save();
    } else {
        console.log('Updated folder:', updatedFolder);
        return updatedFolder;
    }
};

// Setting static files directory
app.use(express.static('views'));
app.use(express.urlencoded({ extended: true }));

// Setting view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sync route
app.get("/sync", async (req, res, next) => {
    try {
        // Call the function to add all folders to the database
        await addFoldersToDatabase(path.join(__dirname, 'views'));

        const folders = await Folder.find();
        console.log('Folders in /sync after database sync:', folders);
        const data = [{ name: 'Sync' }];
        const folder = { folders: [] };
        const subfolder = null;
        const url = "";
        res.render('layout', { folders, data, folder, subfolder, url });
    } catch (error) {
        next(error);
    }
});
// Route for submit page
app.get('/submit', async (req, res, next) => {
    try {
        const folders = await Folder.find();
        console.log('Folders in /submit: ', folders);
        var data = {
            name: 'Submit',
            path: '/submit'      
        };
        res.render('form', { folders, folder: { folders: [] }, data: data, subfolder: null }); // Pass a default value for folder and data
    } catch (error) {
        next(error);
    }
    console.log('Data for /submit route:', data);
});

// Add this route to handle form submissions
app.post('/submit', (req, res) => {
    const { name, url } = req.body;
  
    // Call the function to add the URL to the database
    addUrlToDb(name, url)
      .then(() => {
        // After the data is saved, redirect the user
        res.redirect('/submit');
      })
      .catch(err => {
        // If there was an error, send a 500 response
        console.error(err);
        res.status(500).send('Error saving data to the database');
      });
});

// Sync route
app.get("/sync", async (req, res, next) => {
    try {
        const viewFolders = fs.readdirSync(path.join(__dirname, 'views')); // Replace 'views' with the path to your views if necessary

        for (const folderName of viewFolders) {
            let folder = await Folder.findOne({ name: folderName });

            if (!folder) {
                folder = new Folder({ name: folderName });
                await folder.save();
            }
        }

        const folders = await Folder.find();
        console.log('Folders in /sync after database sync:', folders);
        const data = [{ name: 'Sync' }];
        const folder = { folders: [] };
        const subfolder = null;
        const url = "";
        res.render('layout', { folders, data, folder, subfolder, url });
    } catch (error) {
        next(error);
    }
});

// Folder and subfolder route
app.get("/:folderName/:subfolderName?", async (req, res) => {
    try {
        const { folderName, subfolderName } = req.params;
        const folder = await Folder.findOne({ name: folderName });
        const subfolder = await Folder.findOne({ name: subfolderName });
        const folders = await Folder.find();
        const data = folders.map(folder => ({
            name: folder.name,
            url: folder.url,
            subfolders: folder.subfolders || []
        }));

        // If subfolder exists and is not null, use its url, else use folder's url if folder is not null
        let url = null;
        if (subfolder && subfolder.url) {
            url = subfolder.url;
        } else if (folder && folder.url) {
            url = folder.url;
        }

        // Fetch views from the database
        const views = folder ? folder.views : 0;

        res.render('layout', { folder, subfolder, folders, data: [data], url: url, views: views });
    } catch (error) {
        console.error('Error rendering layout:', error);
        res.status(500).send('Error rendering layout');
    }
});

app.post('/increment-view', async (req, res) => {
    const { folderName } = req.body;
    try {
        await Folder.updateOne({ name: folderName }, { $inc: { views: 1 } });
        res.status(200).send('View count incremented');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error incrementing view count');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
    console.log('Error:', err.stack);
});

// Starting the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
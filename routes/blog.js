const { Router } = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const Blog = require("../models/blog");
const Comment = require("../models/comment");

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(`./public/uploads/`));
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

router.get("/add-new", (req, res) => {
  return res.render("addBlog", {
    user: req.user,
  });
});

//Route for editing
router.get("/edit/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  return res.render("editBlog", {
    user: req.user,
    blog,
  });
});

//for updating
router.post("/update/:id", upload.single("coverImage"), async (req, res) => {
  const { title, body } = req.body;
  const updateData = {
    title,
    body,
  };

  if (req.file) {
    updateData.coverImageURL = `/uploads/${req.file.filename}`;
  }

  await Blog.findByIdAndUpdate(req.params.id, updateData);
  return res.redirect(`/blog/${req.params.id}`);
});

//for deleting blog
router.get("/delete/:id", async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  return res.redirect("/");
});

//for deleting comment
router.get("/comment/delete/:commentId", async (req, res) => {
  const commentId = req.params.commentId;

  // Validate the commentId
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(400).send("Invalid Comment ID");
  }

  const comment = await Comment.findById(commentId).populate("createdBy");

  // Check if the comment exists
  if (!comment) {
    return res.status(404).send("Comment not found");
  }

  // Authorization check: Ensure the user is the author of the comment or an admin
  if (
    comment.createdBy._id.toString() !== req.user._id.toString() &&
    req.user.role !== "ADMIN"
  ) {
    return res.status(403).send("Unauthorized to delete this comment");
  }

  // Delete the comment
  await comment.deleteOne();

  // Redirect back to the blog page
  return res.redirect(`/blog/${comment.blogId}`);
});

router.get("/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate("createdBy");
  const comments = await Comment.find({ blogId: req.params.id }).populate(
    "createdBy"
  );

  return res.render("blog", {
    user: req.user,
    blog,
    comments,
  });
});

router.post("/comment/:blogId", async (req, res) => {
  await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});

router.post("/", upload.single("coverImage"), async (req, res) => {
  const { title, body } = req.body;
  const blog = await Blog.create({
    body,
    title,
    createdBy: req.user._id,
    coverImageURL: `/uploads/${req.file.filename}`,
  });
  return res.redirect(`/blog/${blog._id}`);
});

module.exports = router;

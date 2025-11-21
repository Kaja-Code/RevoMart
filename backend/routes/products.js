// routes/products.js
import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// // Get all products (with optional category filter)
// router.get("/", async (req, res) => {
//   try {
//     const { categoryId } = req.query;

//     // Build filter object
//     let filter = { status: "available" };
//     if (categoryId) filter.categoryId = categoryId;

//     const products = await Product.find(filter)
//       .sort({ listedDate: -1 })
//       .populate("ownerId", "username phoneNumber firebaseUid")   // populate owner name
//       .populate("categoryId", "name"); 

//     const result = products.map((p) => ({
//       ...p.toObject(),
//       ownerName: p.ownerId?.username || "Unknown",
//       ownerContact: p.ownerId?.phoneNumber || "Unknown",
//       categoryName: p.categoryId?.name || "Unknown",

//     }));

//     res.json(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });


router.get("/", async (req, res) => {
  try {
    const { categoryId, all } = req.query;

    let filter = {};
    if (!all) {
      // default: only available products
      filter.status = "available";
    }

    if (categoryId) filter.categoryId = categoryId;

    const products = await Product.find(filter)
      .sort({ listedDate: -1 })
      .populate("ownerId", "username phoneNumber firebaseUid")
      .populate("categoryId", "name");

    const result = products.map((p) => ({
      ...p.toObject(),
      ownerName: p.ownerId?.username || "Unknown",
      ownerContact: p.ownerId?.phoneNumber || "Unknown",
      categoryName: p.categoryId?.name || "Unknown",
      buyRequests: p.buyRequests || [],   // ✅ include buy requests
      swapRequests: p.swapRequests || [], // optional: include swaps too
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});


// Create product
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      categoryId,
      title,
      description,
      condition,
      price,
      isForSwap,
      address,
      imagesUrls,
    } = req.body;

    // Validate required fields
    if (!categoryId || !title || !condition || !address || !imagesUrls?.length) {
      return res.status(400).json({ error: "Please fill all required fields" });
    }

    // Create product using firebaseUid as ownerId
    const product = await Product.create({
      ownerId: req.userId,
      categoryId,
      title,
      description,
      condition,
      price,
      isForSwap,
      address,
      imagesUrls,
    });

    res.status(201).json({ message: "Product added successfully", product });
  } catch (err) {
    console.error("Failed to add product:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// 🔹 Create swap request
router.post("/:id/swap", async (req, res) => {
  try {
    const { buyerId, buyerProductId } = req.body;
    const sellerProductId = req.params.id;

    const product = await Product.findById(sellerProductId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 🔹 Check if swap request already exists
    const alreadyRequested = product.swapRequests.some(
      (req) => req.buyerId === buyerId && req.buyerProductId === buyerProductId
    );

    if (alreadyRequested) {
      return res.status(400).json({ error: "Swap request already sent" });
    }

    // Push swap request
    product.swapRequests.push({
      buyerId,
      buyerProductId,
      status: "pending",
    });

    await product.save();

    res.json({ message: "Swap request created", product });
  } catch (err) {
    console.error("Swap request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Cancel a swap request (buyer only)
router.patch("/:id/swap/:requestId/cancel", async (req, res) => {
  try {
    const { id: productId, requestId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const request = product.swapRequests.id(requestId);
    if (!request) return res.status(404).json({ error: "Swap request not found" });

    // Only buyer can cancel
    if (request.buyerId !== req.body.userId) {
      return res.status(403).json({ error: "You are not authorized to cancel this request" });
    }

    request.status = "cancelled";
    await product.save();

    res.json({ message: "Swap request cancelled", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});






// Respond to a swap request (seller only)
router.patch("/:productId/swap/:swapId/respond", async (req, res) => {
  try {
    const { productId, swapId } = req.params;
    const { status, userId } = req.body; // seller's Firebase UID

    // Fetch seller's product and populate owner
    const product = await Product.findById(productId).populate("ownerId", "firebaseUid");
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Find the swap request safely
    const swapReq = product.swapRequests.find(req => req._id.toString() === swapId);
    if (!swapReq) return res.status(404).json({ message: "Swap request not found" });

    // Only seller can respond
    if (product.ownerId.firebaseUid !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update this swap request status
    swapReq.status = status;

    if (status === "accepted") {
      // 1️⃣ Seller product → swapped
      product.status = "swapped";

      // 2️⃣ Reject all other swap requests for this seller product
      product.swapRequests.forEach(req => {
        if (req._id.toString() !== swapId) req.status = "rejected";
      });

      // 3️⃣ Reject all buy requests on seller product
      product.buyRequests.forEach(req => {
        req.status = "rejected";
      });

      // 4️⃣ Buyer’s offered product
      const buyerProduct = await Product.findById(swapReq.buyerProductId);
      if (buyerProduct) {
        // Mark buyer product as swapped
        buyerProduct.status = "swapped";

        // Reject all buy requests on buyer product
        buyerProduct.buyRequests.forEach(req => {
          req.status = "rejected";
        });

        // Reject all swap requests on buyer product
        buyerProduct.swapRequests.forEach(req => {
          req.status = "rejected";
        });

        await buyerProduct.save();
      }

      // 5️⃣ Reject swap requests on other seller products where the same buyer product is offered
      await Product.updateMany(
        {
          _id: { $ne: productId },
          "swapRequests.buyerProductId": swapReq.buyerProductId
        },
        {
          $set: { "swapRequests.$[elem].status": "rejected" }
        },
        {
          arrayFilters: [{ "elem.buyerProductId": swapReq.buyerProductId }],
          multi: true
        }
      );
    }

    await product.save();

    res.json({ message: "Swap request updated successfully", product, swapReq });
  } catch (err) {
    console.error("Swap response error:", err);
    res.status(500).json({ message: "Server error" });
  }
});






// Delete product (only owner can delete, cancels swaps too)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // ✅ Authorization check
    if (product.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this product" });
    }

    // Cancel pending swaps if this is seller
    if (product.swapRequests?.length) {
      product.swapRequests.forEach((swap) => {
        if (swap.status === "pending") swap.status = "cancelled";
      });
      await product.save();
    }

    // Cancel pending swaps where this product is used as buyer
    const otherProducts = await Product.find({ "swapRequests.buyerProductId": id });
    for (const p of otherProducts) {
      let updated = false;
      p.swapRequests.forEach((swap) => {
        if (swap.buyerProductId === id && swap.status === "pending") {
          swap.status = "cancelled";
          updated = true;
        }
      });
      if (updated) await p.save();
    }

    await product.deleteOne();

    res.json({ message: "Product deleted successfully, related pending swaps cancelled" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});



// POST /api/products/:id/buy
router.post("/:id/buy", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    if (product.status === "sold") {
      return res.status(400).json({ error: "This product is already sold" });
    }

    const alreadyRequested = (product.buyRequests || []).some(r => {
      const buyerId = r.buyerId?._id || r.buyerId;
      return buyerId?.toString() === req.userId?.toString() && r.status === "pending";
    });

    if (alreadyRequested) {
      return res.status(400).json({ error: "You already have a pending buy request" });
    }

    // Add new buy request
    product.buyRequests.push({ buyerId: req.userId, status: "pending" });
    await product.save();

    // Populate the buyer info
    await product.populate({
      path: "buyRequests.buyerId",
      select: "firebaseUid username phoneNumber",
    });

    const newRequest = product.buyRequests[product.buyRequests.length - 1];

    // 🔹 Return in the shape your frontend expects
    res.json({
      success: true,
      product: {
        ...product.toObject(),
        buyRequests: product.buyRequests,
      },
      newRequest, // optional
    });
  } catch (err) {
    console.error("Buy request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});






// Get all buy request products 
// router.get("/buy-requests", async (req, res) => {
//   try {
//     const { categoryId, all } = req.query;

//     let filter = {};
//     if (!all) {
//       // default: only available products
//       filter.status = "available";
//     }

//     if (categoryId) filter.categoryId = categoryId;

//    const products = await Product.find(filter)
//   .sort({ listedDate: -1 })
//   .populate("ownerId", "username phoneNumber firebaseUid")
//   .populate("buyRequests.buyerId", "firebaseUid username phoneNumber")  // ✅ populate buyer
//   .populate("categoryId", "name");

// const result = products.map(p => ({
//   ...p.toObject(),
//   ownerName: p.ownerId?.username || "Unknown",
//   ownerContact: p.ownerId?.phoneNumber || "Unknown",
//   categoryName: p.categoryId?.name || "Unknown",
//   buyRequests: p.buyRequests.map(req => ({
//     ...req.toObject(),
//     buyerId: req.buyerId?.firebaseUid || req.buyerId?._id, // populate with UID
//   })),
//   swapRequests: p.swapRequests || [],
// }));


//     res.json(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });

// Get all buy request products 
router.get("/buy-requests", async (req, res) => {
  try {
    const { categoryId, all } = req.query;

    let filter = {};
   if (!all) {
  filter.$or = [
    { status: "available" },
    { "buyRequests.status": "accepted" }, // include sold ones with accepted requests
  ];
}


    if (categoryId) filter.categoryId = categoryId;

    const products = await Product.find(filter)
      .populate("ownerId", "username phoneNumber firebaseUid")
      .populate({
        path: "buyRequests.buyerId",
        model: "User",
        select: "username phoneNumber firebaseUid"
      })
      .populate("categoryId", "name");

    const result = products.map((p) => {
      // Log owner info
      // console.log("Product:", p.title);
      // console.log("Owner ID:", p.ownerId?._id);
      // console.log("Owner Name:", p.ownerId?.username);
      // console.log("Owner Firebase UID:", p.ownerId?.firebaseUid);

      const buyRequests = p.buyRequests.map((req) => {
        // Log buyer info
        // console.log("  BuyRequest ID:", req._id);
        // console.log("  Buyer raw:", req.buyerId);
        // console.log("  Buyer Name:", req.buyerId?.username);
        // console.log("  Buyer Firebase UID:", req.buyerId?.firebaseUid);

        return {
          ...req.toObject(),
          buyerId: req.buyerId?.firebaseUid || req.buyerId?._id, // keep UID or _id
          buyerName: req.buyerId?.username || "Unknown",        // buyer name
          buyerContact: req.buyerId?.phoneNumber || "Unknown",  // buyer contact
          sellerId: p.ownerId?.firebaseUid || p.ownerId?._id,   // seller UID/_id
          sellerName: p.ownerId?.username || "Unknown",         // seller name
          sellerContact: p.ownerId?.phoneNumber || "Unknown",   // seller contact
        };
      });

      return {
        ...p.toObject(),
        ownerName: p.ownerId?.username || "Unknown",
        ownerContact: p.ownerId?.phoneNumber || "Unknown",
        categoryName: p.categoryId?.name || "Unknown",
        buyRequests,
        swapRequests: p.swapRequests || [],
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});


// Cancel a buy request (buyer only)
router.patch("/:id/buy/:requestId/cancel", authMiddleware, async (req, res) => {
  try {
    const { id: productId, requestId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const request = product.buyRequests.id(requestId);
    if (!request) return res.status(404).json({ error: "Buy request not found" });

    // 🔹 Ensure both are strings for comparison
    if (String(request.buyerId) !== String(req.userId)) {
      return res.status(403).json({ error: "You are not authorized to cancel this request" });
    }

    request.status = "cancelled";
    await product.save();

    res.json({ message: "Buy request cancelled", request });
  } catch (err) {
    console.error("Cancel buy error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Respond to a buy request (seller only: accept/reject)
router.patch("/:productId/buy/:requestId/respond", authMiddleware, async (req, res) => {
  try {
    const { productId, requestId } = req.params;
    const { status } = req.body;

    const product = await Product.findById(productId)
      .populate("ownerId", "firebaseUid")
      .populate("buyRequests.buyerId", "firebaseUid username");

    if (!product) return res.status(404).json({ error: "Product not found" });

    const request = product.buyRequests.id(requestId);
    if (!request) return res.status(404).json({ error: "Buy request not found" });

    // ✅ Only owner can respond (Mongo _id check works in your case)
    if (product.ownerId._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (status === "accepted") {
      product.status = "sold";

      // Accept this one
      request.status = "accepted";

      // Reject all other buy requests
      product.buyRequests.forEach(r => {
        if (r._id.toString() !== requestId) {
          r.status = "rejected";
        }
      });

      // 🔹 Also reject all swap requests
      if (product.swapRequests?.length) {
        product.swapRequests.forEach(swap => {
          swap.status = "rejected";
        });
      }

    } else {
      // Rejected by seller
      request.status = "rejected";
    }

    await product.save();

    res.json({
      message: "Buy request updated",
      request,
      product
    });
  } catch (err) {
    console.error("Respond buy error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Increment product views count
router.post("/:id/view", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("🟢 /view endpoint hit for product:", id);

    const product = await Product.findById(id).populate("ownerId", "firebaseUid");
    if (!product) {
      console.log("❌ Product not found:", id);
      return res.status(404).json({ error: "Product not found" });
    }

    // console.log("👤 Viewer Mongo ID:", req.userId);         // MongoDB user ID from middleware
    // console.log("🏠 Owner UID (Firebase):", product.ownerId?.firebaseUid);
    // console.log("📝 Owner Mongo ID:", product.ownerId?._id);

    // Skip counting if owner views
    if (req.userId && product.ownerId?._id.equals(req.userId)) {
      // console.log("⚠️ Owner viewed product, not counting");
      return res.json({ success: false, message: "Owner view not counted" });
    }

    // Increment views count
    product.viewsCount = (product.viewsCount || 0) + 1;
    await product.save();

    // console.log("✅ View incremented. New count:", product.viewsCount);

    res.json({ success: true, viewsCount: product.viewsCount });
  } catch (err) {
    console.error("💥 Error incrementing views:", err.message);
    res.status(500).json({ error: "Failed to increment views" });
  }
});






export default router;

const express = require("express");
const BusinessSegment = require("../models/BusinessSegment");
const { requireSuperAdminDatabase } = require("../config/superAdminDatabase");

const router = express.Router();
router.use(requireSuperAdminDatabase);

router.get("/", async (request, response, next) => {
  try {
    const segments = await BusinessSegment.find({ enabled: true }).sort({ name: 1 }).lean();
    return response.json({
      success: true,
      data: segments.map(({ _id, segmentId, name, code, description, baseProfile }) => ({
        id: _id.toString(),
        segmentId,
        name,
        code,
        description,
        baseProfile,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

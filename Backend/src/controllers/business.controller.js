import Business from "../models/business.model.js";




const createBusiness = async (req, res) => {
  try {
    const { name, category, description, address, phone, website, logoUrl } =
      req.body;

    if (!name) {
      return res.status(400).json({
        message: "Business name is required",
      });
    }

    const business = await Business.create({
      ownerId: req.user._id,
      name,
      category,
      description,
      address,
      phone,
      website,
      logoUrl,
    });

    return res.status(201).json({
      message: "Business created successfully",
      business,
    });
  } catch (error) {
    console.error("Create business error:", error);

    return res.status(500).json({
      message: "Failed to create business",
    });
  }
};

const getMyBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({
      ownerId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      businesses,
    });
  } catch (error) {
    console.error("Get businesses error:", error);

    return res.status(500).json({
      message: "Failed to fetch businesses",
    });
  }
};

const getBusinessById = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findOne({
      _id: businessId,
      ownerId: req.user._id,
    });

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    return res.status(200).json({
      business,
    });
  } catch (error) {
    console.error("Get business error:", error);

    return res.status(500).json({
      message: "Failed to fetch business",
    });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;

    const {
      name,
      category,
      description,
      address,
      phone,
      website,
      logoUrl,
    } = req.body;

    const business = await Business.findOneAndUpdate(
      {
        _id: businessId,
        ownerId: req.user._id,
      },
      {
        name,
        category,
        description,
        address,
        phone,
        website,
        logoUrl,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    return res.status(200).json({
      message: "Business updated successfully",
      business,
    });
  } catch (error) {
    console.error("Update business error:", error);

    return res.status(500).json({
      message: "Failed to update business",
    });
  }
};

const toggleBusinessStatus = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findOne({
      _id: businessId,
      ownerId: req.user._id,
    });

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    business.isActive = !business.isActive;

    await business.save();

    return res.status(200).json({
      message: `Business ${business.isActive ? "enabled" : "disabled"
        } successfully`,
      business,
    });
  } catch (error) {
    console.error("Toggle business status error:", error);

    return res.status(500).json({
      message: "Failed to update business status",
    });
  }
};



export {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  toggleBusinessStatus,
};
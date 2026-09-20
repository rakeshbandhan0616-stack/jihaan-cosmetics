import Contact from "../models/contactModel.js";

const getAuthenticatedUserId = (req) => {
  return req.user?._id || req.user?.id || req.user?.userId || null;
};

// --------------------------------------------------
// Public/User: Create contact message
// POST /api/contact
// --------------------------------------------------

export const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject and message are required",
      });
    }

    const contact = await Contact.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : "",
      subject: String(subject).trim(),
      message: String(message).trim(),
      user: getAuthenticatedUserId(req),
    });

    return res.status(201).json({
      success: true,
      message:
        "Your message has been submitted successfully. Our team will contact you soon.",
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        status: contact.status,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    console.error("Create contact message error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to submit contact message",
    });
  }
};

// --------------------------------------------------
// Admin: Get all contact messages
// GET /api/admin/contact
// --------------------------------------------------

export const getAllContactMessages = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = {};

    if (status && ["new", "read", "replied", "closed"].includes(status)) {
      filter.status = status;
    }

    if (search && String(search).trim()) {
      const searchValue = String(search).trim();

      filter.$or = [
        { name: { $regex: searchValue, $options: "i" } },
        { email: { $regex: searchValue, $options: "i" } },
        { subject: { $regex: searchValue, $options: "i" } },
        { message: { $regex: searchValue, $options: "i" } },
      ];
    }

    const skip = (currentPage - 1) * perPage;

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .populate("user", "name email")
        .populate("repliedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Contact.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      contacts,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("Get contact messages error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch contact messages",
    });
  }
};

// --------------------------------------------------
// Admin: Get single contact message
// GET /api/admin/contact/:id
// --------------------------------------------------

export const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id)
      .populate("user", "name email phone")
      .populate("repliedBy", "name email");

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    if (contact.status === "new") {
      contact.status = "read";
      await contact.save();
    }

    return res.status(200).json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error("Get contact message error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch contact message",
    });
  }
};

// --------------------------------------------------
// Admin: Update contact status/reply
// PATCH /api/admin/contact/:id
// --------------------------------------------------

export const updateContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    if (
      status &&
      !["new", "read", "replied", "closed"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact status",
      });
    }

    if (status) {
      contact.status = status;
    }

    if (typeof adminReply === "string") {
      contact.adminReply = adminReply.trim();

      if (contact.adminReply) {
        contact.status = "replied";
        contact.repliedAt = new Date();
        contact.repliedBy = getAuthenticatedUserId(req);
      }
    }

    await contact.save();

    const updatedContact = await Contact.findById(contact._id)
      .populate("user", "name email")
      .populate("repliedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Contact message updated successfully",
      contact: updatedContact,
    });
  } catch (error) {
    console.error("Update contact message error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update contact message",
    });
  }
};

// --------------------------------------------------
// Admin: Delete contact message
// DELETE /api/admin/contact/:id
// --------------------------------------------------

export const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact message deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact message error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to delete contact message",
    });
  }
};

// --------------------------------------------------
// Admin: Get contact message statistics
// GET /api/admin/contact/stats
// --------------------------------------------------

export const getContactStats = async (req, res) => {
  try {
    const [total, newMessages, readMessages, repliedMessages, closedMessages] =
      await Promise.all([
        Contact.countDocuments(),
        Contact.countDocuments({ status: "new" }),
        Contact.countDocuments({ status: "read" }),
        Contact.countDocuments({ status: "replied" }),
        Contact.countDocuments({ status: "closed" }),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        new: newMessages,
        read: readMessages,
        replied: repliedMessages,
        closed: closedMessages,
      },
    });
  } catch (error) {
    console.error("Get contact stats error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch contact statistics",
    });
  }
};
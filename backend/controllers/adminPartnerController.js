import PartnerApplication from "../models/PartnerApplication.js";

function sanitizeApplication(application) {
  const data = application.toObject();

  delete data.password;

  if (data.bankDetails?.accountNumber) {
    data.bankDetails.accountNumber = `******${data.bankDetails.accountNumber.slice(
      -4
    )}`;
  }

  return data;
}

export async function getPartnerApplications(req, res) {
  try {
    const { status, partnerType } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (partnerType) {
      filter.partnerType = partnerType;
    }

    const applications = await PartnerApplication.find(filter)
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      applications: applications.map(sanitizeApplication),
    });
  } catch (error) {
    console.error("Get partner applications error:", error);

    return res.status(500).json({
      message: "Unable to fetch partner applications.",
    });
  }
}

export async function reviewPartnerApplication(req, res) {
  try {
    const { id } = req.params;
    const { action, remark = "" } = req.body;

    const validActions = ["approve", "reject", "revert"];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        message: "Action must be approve, reject or revert.",
      });
    }

    const application = await PartnerApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        message: "Partner application not found.",
      });
    }

    const statusMap = {
      approve: "approved",
      reject: "rejected",
      revert: "reverted",
    };

    application.status = statusMap[action];
    application.adminRemark = remark.trim();
    application.reviewedBy = req.admin._id;
    application.reviewedAt = new Date();

    await application.save();

    return res.json({
      message: `Application ${application.status} successfully.`,
      application: sanitizeApplication(application),
    });
  } catch (error) {
    console.error("Review partner application error:", error);

    return res.status(500).json({
      message: "Unable to review application.",
    });
  }
}
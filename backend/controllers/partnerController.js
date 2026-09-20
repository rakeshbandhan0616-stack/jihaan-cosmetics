import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import PartnerApplication from "../models/PartnerApplication.js";
import { generateReferenceNumber } from "../utils/generateReferenceNumber.js";

function createToken(application) {
  return jwt.sign(
    {
      id: application._id,
      role: application.partnerType,
      referenceNumber: application.referenceNumber,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

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

export async function registerPartner(req, res) {
  try {
    const {
      partnerType,
      sellerName,
      partnerName,
      businessName,
      businessType,
      email,
      phone,
      alternatePhone,
      password,
      address,
      documents,
      logistics,
      bankDetails,
    } = req.body;

    const name = sellerName || partnerName;

    if (!partnerType || !["seller", "logisticpartner"].includes(partnerType)) {
      return res.status(400).json({
        message: "Valid partner type is required.",
      });
    }

    if (
      !name ||
      !businessName ||
      !businessType ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        message: "Please provide all required registration fields.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const existingApplication = await PartnerApplication.findOne({
      email: email.toLowerCase(),
      partnerType,
      status: { $in: ["pending", "approved", "reverted"] },
    });

    if (existingApplication) {
      return res.status(409).json({
        message:
          "An application already exists for this email address.",
        referenceNumber: existingApplication.referenceNumber,
        status: existingApplication.status,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let referenceNumber = generateReferenceNumber(partnerType);

    while (await PartnerApplication.exists({ referenceNumber })) {
      referenceNumber = generateReferenceNumber(partnerType);
    }

    const application = await PartnerApplication.create({
      referenceNumber,
      partnerType,
      name,
      businessName,
      businessType,
      email: email.toLowerCase(),
      phone,
      alternatePhone,
      password: hashedPassword,
      address,
      documents,
      logistics,
      bankDetails,
      status: "pending",
    });

    return res.status(201).json({
      message:
        "Registration submitted successfully. Your application is pending admin review.",
      referenceNumber: application.referenceNumber,
      status: application.status,
      application: sanitizeApplication(application),
    });
  } catch (error) {
    console.error("Partner registration error:", error);

    return res.status(500).json({
      message: "Unable to submit registration.",
    });
  }
}

export async function loginPartner(req, res) {
  try {
    const { partnerType, email, password } = req.body;

    if (!partnerType || !email || !password) {
      return res.status(400).json({
        message: "Partner type, email and password are required.",
      });
    }

    const application = await PartnerApplication.findOne({
      partnerType,
      email: email.toLowerCase(),
    }).select("+password");

    if (!application) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatched = await bcrypt.compare(
      password,
      application.password
    );

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (application.status === "pending") {
      return res.status(403).json({
        message: "Your application is still pending admin review.",
        referenceNumber: application.referenceNumber,
        status: application.status,
      });
    }

    if (application.status === "reverted") {
      return res.status(403).json({
        message:
          application.adminRemark ||
          "Your application was reverted for corrections.",
        referenceNumber: application.referenceNumber,
        status: application.status,
      });
    }

    if (application.status === "rejected") {
      return res.status(403).json({
        message:
          application.adminRemark ||
          "Your application has been rejected.",
        referenceNumber: application.referenceNumber,
        status: application.status,
      });
    }

    const token = createToken(application);

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: application._id,
        name: application.name,
        businessName: application.businessName,
        email: application.email,
        role: application.partnerType,
        status: application.status,
        referenceNumber: application.referenceNumber,
      },
    });
  } catch (error) {
    console.error("Partner login error:", error);

    return res.status(500).json({
      message: "Unable to login.",
    });
  }
}

export async function getApplicationStatus(req, res) {
  try {
    const { referenceNumber } = req.params;

    const application = await PartnerApplication.findOne({
      referenceNumber: referenceNumber.toUpperCase(),
    });

    if (!application) {
      return res.status(404).json({
        message: "Application not found.",
      });
    }

    return res.json({
      referenceNumber: application.referenceNumber,
      partnerType: application.partnerType,
      name: application.name,
      businessName: application.businessName,
      status: application.status,
      adminRemark: application.adminRemark,
      createdAt: application.createdAt,
      reviewedAt: application.reviewedAt,
    });
  } catch (error) {
    console.error("Application status error:", error);

    return res.status(500).json({
      message: "Unable to fetch application status.",
    });
  }
}
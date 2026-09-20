import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =========================================================
   ROLE CONFIGURATION
========================================================= */

const STAFF_ROLES = [
  "superadmin",
  "admin",
  "accounts",
  "logistics",
];

const CUSTOMER_ROLE = "user";

/* =========================================================
   CREATE JWT TOKEN
========================================================= */

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing in the .env file",
    );
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "7d",
    },
  );
};

/* =========================================================
   FORMAT USER RESPONSE

   Never return password.
========================================================= */

const getUserResponse = (user) => {
  return {
    id: user._id.toString(),

    _id: user._id.toString(),

    name: user.name,

    email: user.email,

    phone: user.phone || "",

    profileImage:
      user.profileImage || "",

    role: user.role,

    isActive:
      user.isActive,

    isEmailVerified:
      user.isEmailVerified,

    lastLoginAt:
      user.lastLoginAt || null,

    createdAt:
      user.createdAt,

    updatedAt:
      user.updatedAt,
  };
};

/* =========================================================
   SET AUTH COOKIE
========================================================= */

const setAuthCookie = (
  res,
  token,
) => {
  const isProduction =
    process.env.NODE_ENV ===
    "production";

  res.cookie(
    "token",
    token,
    {
      httpOnly: true,

      secure:
        isProduction,

      sameSite:
        isProduction
          ? "none"
          : "lax",

      maxAge:
        7 *
        24 *
        60 *
        60 *
        1000,
    },
  );
};

/* =========================================================
   NORMALIZE PHONE NUMBER
========================================================= */

const normalizePhone = (
  phone,
) => {
  let normalizedPhone =
    String(
      phone || "",
    ).replace(
      /\D/g,
      "",
    );

  if (
    normalizedPhone.startsWith(
      "91",
    ) &&
    normalizedPhone.length ===
      12
  ) {
    normalizedPhone =
      normalizedPhone.slice(
        2,
      );
  }

  return normalizedPhone;
};

/* =========================================================
   VALIDATE INDIAN PHONE NUMBER
========================================================= */

const isValidPhone = (
  phone,
) => {
  return /^[6-9][0-9]{9}$/.test(
    phone,
  );
};

/* =========================================================
   VALIDATE EMAIL
========================================================= */

const isValidEmail = (
  email,
) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
};

/* =========================================================
   STAFF LOGIN

   Allowed:
   - superadmin
   - admin
   - accounts
   - logistics

   POST /api/auth/admin-login
========================================================= */

export const adminLogin =
  async (
    req,
    res,
  ) => {
    try {
      /*
       * Support:
       *
       * { email, password }
       *
       * and also:
       *
       * { identifier, password }
       *
       * { login, password }
       */

      const rawEmail =
        req.body?.email ??
        req.body?.identifier ??
        req.body?.login ??
        "";

      const rawPassword =
        req.body?.password ??
        "";

      const normalizedEmail =
        String(
          rawEmail,
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          rawPassword,
        );

      /* -----------------------------------------------------
         REQUIRED FIELDS
      ----------------------------------------------------- */

      if (
        !normalizedEmail ||
        !password
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Email and password are required.",
        });
      }

      /* -----------------------------------------------------
         EMAIL VALIDATION
      ----------------------------------------------------- */

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please enter a valid staff email address.",
        });
      }

      /* -----------------------------------------------------
         FIND STAFF ACCOUNT
      ----------------------------------------------------- */

      const staff =
        await User.findOne({
          email:
            normalizedEmail,

          role: {
            $in:
              STAFF_ROLES,
          },
        }).select(
          "+password",
        );

      /* -----------------------------------------------------
         STAFF ACCOUNT NOT FOUND
      ----------------------------------------------------- */

      if (!staff) {
        return res.status(401).json({
          success: false,

          message:
            "Staff account not found. Check the email and staff role.",
        });
      }

      /* -----------------------------------------------------
         VALIDATE STAFF ROLE
      ----------------------------------------------------- */

      if (
        !STAFF_ROLES.includes(
          staff.role,
        )
      ) {
        return res.status(403).json({
          success: false,

          message:
            "This account does not have permission to access the staff portal.",
        });
      }

      /* -----------------------------------------------------
         BLOCKED ACCOUNT
      ----------------------------------------------------- */

      if (
        staff.isBlocked ===
        true
      ) {
        return res.status(403).json({
          success: false,

          message:
            "This staff account has been blocked.",
        });
      }

      /* -----------------------------------------------------
         INACTIVE ACCOUNT
      ----------------------------------------------------- */

      if (
        staff.isActive ===
        false
      ) {
        return res.status(403).json({
          success: false,

          message:
            "This staff account is inactive.",
        });
      }

      /* -----------------------------------------------------
         PASSWORD EXISTS
      ----------------------------------------------------- */

      if (!staff.password) {
        return res.status(401).json({
          success: false,

          message:
            "This staff account does not have a valid password.",
        });
      }

      /* -----------------------------------------------------
         PASSWORD CHECK
      ----------------------------------------------------- */

      const isPasswordValid =
        await bcrypt.compare(
          password,
          staff.password,
        );

      if (
        !isPasswordValid
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid staff email or password.",
        });
      }

      /* -----------------------------------------------------
         UPDATE LAST LOGIN
      ----------------------------------------------------- */

      staff.lastLoginAt =
        new Date();

      await staff.save();

      /* -----------------------------------------------------
         CREATE JWT
      ----------------------------------------------------- */

      const token =
        createToken(
          staff,
        );

      /* -----------------------------------------------------
         SET COOKIE
      ----------------------------------------------------- */

      setAuthCookie(
        res,
        token,
      );

      /* -----------------------------------------------------
         LOGIN MESSAGE
      ----------------------------------------------------- */

      const roleMessages = {
        superadmin:
          "Superadmin login successful.",

        admin:
          "Admin login successful.",

        accounts:
          "Accounts login successful.",

        logistics:
          "Logistics login successful.",
      };

      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          roleMessages[
            staff.role
          ] ||
          "Staff login successful.",

        token,

        user:
          getUserResponse(
            staff,
          ),
      });
    } catch (error) {
      console.error(
        "STAFF LOGIN ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error during staff login.",

        error:
          process.env
            .NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/* =========================================================
   USER REGISTRATION
========================================================= */

export const registerUser =
  async (
    req,
    res,
  ) => {
    try {
      const {
        name,
        email,
        phone,
        password,
        confirmPassword,
      } =
        req.body;

      /* -----------------------------------------------------
         REQUIRED FIELDS
      ----------------------------------------------------- */

      if (
        !name ||
        !email ||
        !phone ||
        !password
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Name, email, phone, and password are required",
        });
      }

      /* -----------------------------------------------------
         NORMALIZE DATA
      ----------------------------------------------------- */

      const normalizedName =
        String(
          name,
        ).trim();

      const normalizedEmail =
        String(
          email,
        )
          .trim()
          .toLowerCase();

      const normalizedPhone =
        normalizePhone(
          phone,
        );

      /* -----------------------------------------------------
         VALIDATE NAME
      ----------------------------------------------------- */

      if (
        normalizedName.length <
        2
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Name must contain at least 2 characters",
        });
      }

      if (
        normalizedName.length >
        80
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Name cannot exceed 80 characters",
        });
      }

      /* -----------------------------------------------------
         VALIDATE EMAIL
      ----------------------------------------------------- */

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please enter a valid email address",
        });
      }

      /* -----------------------------------------------------
         VALIDATE PHONE
      ----------------------------------------------------- */

      if (
        !isValidPhone(
          normalizedPhone,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please enter a valid 10-digit mobile number",
        });
      }

      /* -----------------------------------------------------
         VALIDATE PASSWORD
      ----------------------------------------------------- */

      if (
        String(password)
          .length < 4
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Password must contain at least 4 characters",
        });
      }

      /* -----------------------------------------------------
         CONFIRM PASSWORD
      ----------------------------------------------------- */

      if (
        confirmPassword !==
          undefined &&
        password !==
          confirmPassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Passwords do not match",
        });
      }

      /* -----------------------------------------------------
         DUPLICATE CHECK
      ----------------------------------------------------- */

      const existingUser =
        await User.findOne({
          $or: [
            {
              email:
                normalizedEmail,
            },

            {
              phone:
                normalizedPhone,
            },
          ],
        });

      if (
        existingUser
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Email or phone number is already registered",
        });
      }

      /* -----------------------------------------------------
         HASH PASSWORD
      ----------------------------------------------------- */

      const hashedPassword =
        await bcrypt.hash(
          password,
          12,
        );

      /* -----------------------------------------------------
         PROFILE IMAGE
      ----------------------------------------------------- */

      const profileImage =
        req.file
          ? `/uploads/users/${req.file.filename}`
          : "";

      /* -----------------------------------------------------
         CREATE CUSTOMER
      ----------------------------------------------------- */

      const user =
        await User.create({
          name:
            normalizedName,

          email:
            normalizedEmail,

          phone:
            normalizedPhone,

          password:
            hashedPassword,

          profileImage,

          role:
            CUSTOMER_ROLE,

          isActive:
            true,

          isBlocked:
            false,

          isEmailVerified:
            false,
        });

      /* -----------------------------------------------------
         JWT
      ----------------------------------------------------- */

      const token =
        createToken(
          user,
        );

      setAuthCookie(
        res,
        token,
      );

      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return res.status(201).json({
        success: true,

        message:
          "Registration successful",

        token,

        user:
          getUserResponse(
            user,
          ),
      });
    } catch (error) {
      console.error(
        "User registration error:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Email or phone number is already registered",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error during registration",
      });
    }
  };

/* =========================================================
   USER LOGIN
========================================================= */

export const userLogin =
  async (
    req,
    res,
  ) => {
    try {
      const {
        identifier,
        login,
        email,
        phone,
        password,
      } =
        req.body;

      const loginInput =
        identifier ??
        login ??
        email ??
        phone;

      /* -----------------------------------------------------
         VALIDATE
      ----------------------------------------------------- */

      if (
        !loginInput ||
        !password
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Email/phone and password are required",
        });
      }

      const loginValue =
        String(
          loginInput,
        ).trim();

      let userQuery;

      /* -----------------------------------------------------
         EMAIL LOGIN
      ----------------------------------------------------- */

      if (
        loginValue.includes(
          "@",
        )
      ) {
        const normalizedEmail =
          loginValue.toLowerCase();

        if (
          !isValidEmail(
            normalizedEmail,
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Please enter a valid email address",
          });
        }

        userQuery = {
          email:
            normalizedEmail,

          role:
            CUSTOMER_ROLE,
        };
      } else {
        /* ---------------------------------------------------
           PHONE LOGIN
        --------------------------------------------------- */

        const normalizedPhone =
          normalizePhone(
            loginValue,
          );

        if (
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Please enter a valid email or 10-digit mobile number",
          });
        }

        userQuery = {
          phone:
            normalizedPhone,

          role:
            CUSTOMER_ROLE,
        };
      }

      /* -----------------------------------------------------
         FIND CUSTOMER
      ----------------------------------------------------- */

      const user =
        await User.findOne(
          userQuery,
        ).select(
          "+password",
        );

      if (!user) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid email/phone or password",
        });
      }

      /* -----------------------------------------------------
         BLOCKED ACCOUNT
      ----------------------------------------------------- */

      if (
        user.isBlocked ===
        true
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Your account has been blocked",
        });
      }

      /* -----------------------------------------------------
         ACCOUNT STATUS
      ----------------------------------------------------- */

      if (
        user.isActive ===
        false
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Your account is inactive",
        });
      }

      /* -----------------------------------------------------
         PASSWORD
      ----------------------------------------------------- */

      if (!user.password) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid email/phone or password",
        });
      }

      const isPasswordValid =
        await bcrypt.compare(
          password,
          user.password,
        );

      if (
        !isPasswordValid
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid email/phone or password",
        });
      }

      /* -----------------------------------------------------
         LAST LOGIN
      ----------------------------------------------------- */

      user.lastLoginAt =
        new Date();

      await user.save();

      /* -----------------------------------------------------
         JWT
      ----------------------------------------------------- */

      const token =
        createToken(
          user,
        );

      setAuthCookie(
        res,
        token,
      );

      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          "Login successful",

        token,

        user:
          getUserResponse(
            user,
          ),
      });
    } catch (error) {
      console.error(
        "User login error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error during login",
      });
    }
  };

/* =========================================================
   LOGOUT
========================================================= */

export const logoutUser =
  async (
    _req,
    res,
  ) => {
    const isProduction =
      process.env.NODE_ENV ===
      "production";

    res.clearCookie(
      "token",
      {
        httpOnly: true,

        secure:
          isProduction,

        sameSite:
          isProduction
            ? "none"
            : "lax",
      },
    );

    return res.status(200).json({
      success: true,

      message:
        "Logout successful",
    });
  };

/* =========================================================
   CURRENT USER / STAFF
========================================================= */

export const getCurrentUser =
  async (
    req,
    res,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,

        message:
          "Not authenticated",
      });
    }

    return res.status(200).json({
      success: true,

      user:
        getUserResponse(
          req.user,
        ),
    });
  };

/* =========================================================
   UPDATE CUSTOMER PROFILE
========================================================= */

export const updateProfile =
  async (
    req,
    res,
  ) => {
    try {
      const {
        name,
        phone,
      } =
        req.body;

      const user =
        await User.findById(
          req.user._id,
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User not found",
        });
      }

      /* -----------------------------------------------------
         NAME
      ----------------------------------------------------- */

      if (
        name !== undefined
      ) {
        const normalizedName =
          String(
            name,
          ).trim();

        if (
          normalizedName.length <
          2
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name must contain at least 2 characters",
          });
        }

        if (
          normalizedName.length >
          80
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name cannot exceed 80 characters",
          });
        }

        user.name =
          normalizedName;
      }

      /* -----------------------------------------------------
         PHONE
      ----------------------------------------------------- */

      if (
        phone !== undefined
      ) {
        const normalizedPhone =
          normalizePhone(
            phone,
          );

        if (
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Please enter a valid 10-digit mobile number",
          });
        }

        const phoneExists =
          await User.findOne({
            phone:
              normalizedPhone,

            _id: {
              $ne:
                user._id,
            },
          });

        if (
          phoneExists
        ) {
          return res.status(409).json({
            success: false,

            message:
              "Phone number is already registered",
          });
        }

        user.phone =
          normalizedPhone;
      }

      /* -----------------------------------------------------
         PROFILE IMAGE
      ----------------------------------------------------- */

      if (req.file) {
        user.profileImage =
          `/uploads/users/${req.file.filename}`;
      }

      /* -----------------------------------------------------
         SAVE
      ----------------------------------------------------- */

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Profile updated successfully",

        user:
          getUserResponse(
            user,
          ),
      });
    } catch (error) {
      console.error(
        "Update profile error:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Phone number is already registered",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update profile",
      });
    }
  };

/* =========================================================
   UPDATE STAFF PROFILE

   Staff can update:
   - Name
   - Email

   Staff cannot update through this endpoint:
   - Role
   - Active status
   - Block status
   - Password

   PUT /api/auth/staff/profile
========================================================= */

export const updateStaffProfile =
  async (
    req,
    res,
  ) => {
    try {
      const {
        name,
        email,
      } =
        req.body || {};

      /* -----------------------------------------------------
         FIND CURRENT USER
      ----------------------------------------------------- */

      const user =
        await User.findById(
          req.user._id,
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "Staff account not found",
        });
      }

      /* -----------------------------------------------------
         STAFF ROLE CHECK
      ----------------------------------------------------- */

      if (
        !STAFF_ROLES.includes(
          user.role,
        )
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Staff account access only",
        });
      }

      /* -----------------------------------------------------
         NAME
      ----------------------------------------------------- */

      if (
        name !== undefined
      ) {
        const normalizedName =
          String(
            name,
          ).trim();

        if (
          normalizedName.length <
          2
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name must contain at least 2 characters",
          });
        }

        if (
          normalizedName.length >
          80
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name cannot exceed 80 characters",
          });
        }

        user.name =
          normalizedName;
      }

      /* -----------------------------------------------------
         EMAIL
      ----------------------------------------------------- */

      if (
        email !== undefined
      ) {
        const normalizedEmail =
          String(
            email,
          )
            .trim()
            .toLowerCase();

        if (
          !normalizedEmail
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Email is required",
          });
        }

        if (
          !isValidEmail(
            normalizedEmail,
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Please enter a valid email address",
          });
        }

        /* ---------------------------------------------------
           CHECK DUPLICATE EMAIL
        --------------------------------------------------- */

        const existingUser =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne:
                user._id,
            },
          });

        if (
          existingUser
        ) {
          return res.status(409).json({
            success: false,

            message:
              "Email address is already registered",
          });
        }

        user.email =
          normalizedEmail;
      }

      /* -----------------------------------------------------
         MAKE SURE NOTHING DANGEROUS IS CHANGED
      ----------------------------------------------------- */

      /*
       * We intentionally do not read:
       *
       * req.body.role
       * req.body.isActive
       * req.body.isBlocked
       * req.body.password
       *
       * Therefore staff cannot change their own
       * permissions or account status through this API.
       */

      /* -----------------------------------------------------
         SAVE
      ----------------------------------------------------- */

      await user.save();

      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          "Staff account updated successfully",

        user:
          getUserResponse(
            user,
          ),
      });
    } catch (error) {
      console.error(
        "Update staff profile error:",
        error,
      );

      /* -----------------------------------------------------
         DUPLICATE EMAIL
      ----------------------------------------------------- */

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Email address is already registered",
        });
      }

      /* -----------------------------------------------------
         VALIDATION ERROR
      ----------------------------------------------------- */

      if (
        error?.name ===
        "ValidationError"
      ) {
        const validationMessages =
          Object.values(
            error.errors || {},
          )
            .map(
              (item) =>
                item.message,
            )
            .filter(Boolean);

        return res.status(400).json({
          success: false,

          message:
            validationMessages.join(
              ", ",
            ) ||
            "Invalid staff account data",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update staff account",
      });
    }
  };

/* =========================================================
   CHANGE PASSWORD

   Works for:
   - Customers
   - Superadmin
   - Admin
   - Accounts
   - Logistics

   The authenticated user can change only
   their own password.

   PUT /api/auth/change-password

   Staff endpoint can also use this controller:
   PUT /api/auth/staff/change-password
========================================================= */

export const changePassword =
  async (
    req,
    res,
  ) => {
    try {
      const {
        currentPassword,
        newPassword,
        confirmPassword,
      } =
        req.body;

      /* -----------------------------------------------------
         REQUIRED
      ----------------------------------------------------- */

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "All password fields are required",
        });
      }

      /* -----------------------------------------------------
         PASSWORD LENGTH
      ----------------------------------------------------- */

      if (
        String(
          newPassword,
        ).length < 4
      ) {
        return res.status(400).json({
          success: false,

          message:
            "New password must contain at least 4 characters",
        });
      }

      /* -----------------------------------------------------
         PASSWORD CONFIRMATION
      ----------------------------------------------------- */

      if (
        newPassword !==
        confirmPassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "New passwords do not match",
        });
      }

      /* -----------------------------------------------------
         USER
      ----------------------------------------------------- */

      const user =
        await User.findById(
          req.user._id,
        ).select(
          "+password",
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User not found",
        });
      }

      /* -----------------------------------------------------
         ACCOUNT STATUS
      ----------------------------------------------------- */

      if (
        user.isBlocked ===
        true
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Your account has been blocked",
        });
      }

      if (
        user.isActive ===
        false
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Your account is inactive",
        });
      }

      /* -----------------------------------------------------
         CURRENT PASSWORD
      ----------------------------------------------------- */

      if (!user.password) {
        return res.status(401).json({
          success: false,

          message:
            "Current password is incorrect",
        });
      }

      const isCurrentPasswordValid =
        await bcrypt.compare(
          currentPassword,
          user.password,
        );

      if (
        !isCurrentPasswordValid
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Current password is incorrect",
        });
      }

      /* -----------------------------------------------------
         PREVENT SAME PASSWORD
      ----------------------------------------------------- */

      const isSamePassword =
        await bcrypt.compare(
          newPassword,
          user.password,
        );

      if (
        isSamePassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "New password must be different from your current password",
        });
      }

      /* -----------------------------------------------------
         HASH NEW PASSWORD
      ----------------------------------------------------- */

      user.password =
        await bcrypt.hash(
          newPassword,
          12,
        );

      /* -----------------------------------------------------
         SAVE
      ----------------------------------------------------- */

      await user.save();

      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change password error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to change password",
      });
    }
  };
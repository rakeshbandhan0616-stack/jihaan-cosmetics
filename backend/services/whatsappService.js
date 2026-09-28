/* =========================================================
   WHATSAPP SERVICE
   JINI COSMETICS / JIHAAN COSMETICS

   Used for:
   - Social registration OTP
   - Forgot password OTP

   IMPORTANT:
   Never expose WHATSAPP_ACCESS_TOKEN to frontend.
   Keep it only in backend .env
========================================================= */

/* =========================================================
   NORMALIZE INDIAN PHONE NUMBER
========================================================= */

const normalizeIndianPhone = (
  phone,
) => {
  let normalized =
    String(
      phone || "",
    ).replace(
      /\D/g,
      "",
    );

  /*
   * Convert:
   *
   * +91 9876543210
   * 919876543210
   *
   * to:
   *
   * 9876543210
   */

  if (
    normalized.startsWith("91") &&
    normalized.length === 12
  ) {
    normalized =
      normalized.slice(2);
  }

  return normalized;
};

/* =========================================================
   VALIDATE INDIAN PHONE
========================================================= */

const isValidIndianPhone = (
  phone,
) => {
  return /^[6-9][0-9]{9}$/.test(
    phone,
  );
};

/* =========================================================
   FORMAT WHATSAPP RECIPIENT
========================================================= */

const formatWhatsAppRecipient = (
  phone,
) => {
  const normalized =
    normalizeIndianPhone(
      phone,
    );

  if (
    !isValidIndianPhone(
      normalized,
    )
  ) {
    throw new Error(
      "Invalid Indian mobile number",
    );
  }

  /*
   * WhatsApp Cloud API expects
   * the country code without +.
   *
   * Example:
   * 919876543210
   */

  return `91${normalized}`;
};

/* =========================================================
   GET WHATSAPP CONFIG
========================================================= */

const getWhatsAppConfig = () => {
  const accessToken =
    process.env
      .WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId =
    process.env
      .WHATSAPP_PHONE_NUMBER_ID;

  const graphVersion =
    process.env
      .WHATSAPP_GRAPH_VERSION ||
    "v24.0";

  const templateName =
    process.env
      .WHATSAPP_OTP_TEMPLATE_NAME;

  const languageCode =
    process.env
      .WHATSAPP_OTP_LANGUAGE_CODE ||
    "en_US";

  if (!accessToken) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN is missing",
    );
  }

  if (!phoneNumberId) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID is missing",
    );
  }

  if (!templateName) {
    throw new Error(
      "WHATSAPP_OTP_TEMPLATE_NAME is missing",
    );
  }

  return {
    accessToken,
    phoneNumberId,
    graphVersion,
    templateName,
    languageCode,
  };
};

/* =========================================================
   SEND WHATSAPP OTP
========================================================= */

export const sendWhatsAppOtp =
  async ({
    phone,
    otp,
  }) => {
    const {
      accessToken,
      phoneNumberId,
      graphVersion,
      templateName,
      languageCode,
    } =
      getWhatsAppConfig();

    if (!otp) {
      throw new Error(
        "OTP is required",
      );
    }

    const recipient =
      formatWhatsAppRecipient(
        phone,
      );

    const url =
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

    /*
     * IMPORTANT:
     *
     * This payload expects a WhatsApp
     * Authentication template with:
     *
     * - Body OTP variable
     * - Copy Code authentication button
     *
     * Template example:
     *
     * Your Jini Cosmetics verification
     * code is {{1}}.
     *
     * Do not share this code with anyone.
     */

    const payload = {
      messaging_product:
        "whatsapp",

      to: recipient,

      type: "template",

      template: {
        name:
          templateName,

        language: {
          code:
            languageCode,
        },

        components: [
          {
            type: "body",

            parameters: [
              {
                type: "text",

                text:
                  String(otp),
              },
            ],
          },

          {
            type: "button",

            sub_type:
              "copy_code",

            index: "0",

            parameters: [
              {
                type: "text",

                text:
                  String(otp),
              },
            ],
          },
        ],
      },
    };

    const response =
      await fetch(
        url,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const data =
      await response
        .json()
        .catch(
          () => ({}),
        );

    if (!response.ok) {
      console.error(
        "WHATSAPP API ERROR:",
        JSON.stringify(
          data,
          null,
          2,
        ),
      );

      const errorMessage =
        data?.error
          ?.message ||
        "WhatsApp message could not be sent";

      const error =
        new Error(
          errorMessage,
        );

      error.status =
        response.status;

      error.whatsappError =
        data?.error || null;

      throw error;
    }

    return {
      success:
        true,

      messageId:
        data?.messages?.[0]
          ?.id || null,

      recipient,
    };
  };

/* =========================================================
   TEST WHATSAPP CONFIGURATION

   Optional helper for development.
========================================================= */

export const getWhatsAppStatus =
  () => {
    return {
      configured:
        Boolean(
          process.env
            .WHATSAPP_ACCESS_TOKEN &&
            process.env
              .WHATSAPP_PHONE_NUMBER_ID &&
            process.env
              .WHATSAPP_OTP_TEMPLATE_NAME,
        ),

      phoneNumberId:
        process.env
          .WHATSAPP_PHONE_NUMBER_ID ||
        null,

      graphVersion:
        process.env
          .WHATSAPP_GRAPH_VERSION ||
        "v24.0",

      templateName:
        process.env
          .WHATSAPP_OTP_TEMPLATE_NAME ||
        null,

      languageCode:
        process.env
          .WHATSAPP_OTP_LANGUAGE_CODE ||
        "en_US",
    };
  };
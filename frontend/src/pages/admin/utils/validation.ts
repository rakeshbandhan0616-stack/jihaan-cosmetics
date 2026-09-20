export const validateRequired = (
  value: string,
  fieldName: string,
): string | null => {
  if (!value.trim()) {
    return `${fieldName} is required.`;
  }

  return null;
};

export const validateOfferForm = (form: {
  name: string;
  brand: string;
  category: string;
  price: string;
  image: string;
}): string | null => {
  const fields = [
    { value: form.name, name: "Offer name" },
    { value: form.brand, name: "Brand" },
    { value: form.category, name: "Category" },
    { value: form.price, name: "Price" },
    { value: form.image, name: "Image URL" },
  ];

  for (const field of fields) {
    const error = validateRequired(field.value, field.name);

    if (error) {
      return error;
    }
  }

  if (Number(form.price) < 0) {
    return "Price cannot be negative.";
  }

  return null;
};

export const validateProductForm = (form: {
  name: string;
  price: string;
  image: string;
}): string | null => {
  if (!form.name.trim()) {
    return "Product name is required.";
  }

  if (!form.price.trim()) {
    return "Product price is required.";
  }

  if (Number(form.price) < 0) {
    return "Product price cannot be negative.";
  }

  if (!form.image.trim()) {
    return "Product image is required.";
  }

  return null;
};
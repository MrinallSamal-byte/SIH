import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";

const signUpSchema = z
  .object({
    fullName: z.string().min(1, { message: "Full Name is required" }),
    phone: z
      .string()
      .min(10, { message: "Must be 10 digits" })
      .regex(/^\d{10}$/, { message: "Invalid phone number" }),
    email: z
      .string()
      .email({ message: "Invalid email address" })
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
    state: z.string().min(1, { message: "State is required" }),
    district: z.string().min(1, { message: "District is required" }),
    role: z.enum(["Citizen", "Volunteer"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Set error on confirmPassword field
  });
const SignUp = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    state: "",
    district: "",
    role: "Citizen",
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear the error for the field being edited
    if (errors[e.target.name]) {
      const newErrors = { ...errors };
      delete newErrors[e.target.name];
      setErrors(newErrors);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = signUpSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        // Set the first error for each field
        if (!fieldErrors[issue.path[0]]) {
          fieldErrors[issue.path[0]] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({}); // Clear errors on successful validation
    // In a real app, you'd have registration logic here.
    console.log("Registering with:", result.data);
    // For demonstration, we'll just navigate to the login page.
    navigate("/login");
  };

  const InputField = ({
    label,
    name,
    type = "text",
    required = false,
    optional = false,
  }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-300">
        {label} {required && <span className="text-red-500">*</span>}{" "}
        {optional && <span className="text-xs text-zinc-400">(Optional)</span>}
      </label>
      <div className="mt-1">
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          value={formData[name]}
          onChange={handleChange}
          className="block w-full rounded-md border-zinc-700 bg-zinc-800/50 p-3 text-white placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {errors[name] && (
          <p className="mt-1 text-xs text-red-400">{errors[name]}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-8 rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-lg"
      >
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Or{" "}
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <InputField label="Full Name" name="fullName" required />
            <InputField label="Phone Number" name="phone" type="tel" required />
            <InputField label="Email" name="email" type="email" optional />
            <InputField
              label="Password"
              name="password"
              type="password"
              required
            />
            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              required
            />
            <InputField label="State" name="state" required />
            <InputField label="District" name="district" required />
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-zinc-300"
              >
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800/50 p-3 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option>Citizen</option>
                <option>Volunteer</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-xs text-red-400">{errors.role}</p>
              )}
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-3 px-4 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Sign Up
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SignUp;

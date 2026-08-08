import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, you'd have authentication logic here.
    console.log("Logging in with:", email, password);
    // For demonstration, we'll just navigate to the admin dashboard.
    navigate("/admin");
  };

  return (
    <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-black/40 p-10 shadow-2xl backdrop-blur-lg"
      >
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Or{" "}
            <Link
              to="/register"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full rounded-md border-zinc-700 bg-zinc-800/50 p-3 text-white placeholder-zinc-400 focus:z-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Email address or Phone"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full rounded-md border-zinc-700 bg-zinc-800/50 p-3 text-white placeholder-zinc-400 focus:z-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-3 px-4 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Sign In
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;

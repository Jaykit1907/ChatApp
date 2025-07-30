import { useState } from "react";
import { Link } from "react-router-dom";
import useLogin from "../../hooks/useLogin";
import "./Login.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const { loading, login } = useLogin();

	const handleSubmit = async (e) => {
		e.preventDefault();
		await login(username, password);
	};

	return (
		<div className="login-container">
			<div className="login-box">
				<h1 className="login-title">
					Lσɠιɳ Tσ <span className="brand-name">ᑕOᑎᑎEᑕT🪢</span>
				</h1>

				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<label>Username</label>
						<input
							type="text"
							placeholder="Enter username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label>Password</label>
						<div className="password-wrapper">
							<input
								type={showPassword ? "text" : "password"}
								placeholder="Enter password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
							{password.length > 0 && (
								<span
									className="toggle-password"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? <FaEyeSlash /> : <FaEye />}
								</span>
							)}
						</div>
					</div>

					<Link to="/signup" className="signup-link">
						Don't have an account?
					</Link>

					<div>
					<button
	type="submit"
	className={`login-button ${loading ? "blurred-loading" : ""}`}
	disabled={loading}
>
	{loading ? <span className="custom-spinner"></span> : "Login"}
</button>



					</div>
				</form>
			</div>
		</div>
	);
};

export default Login;

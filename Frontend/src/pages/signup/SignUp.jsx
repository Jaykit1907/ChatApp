import { useState } from "react";
import { Link } from "react-router-dom";
import useSignup from "../../hooks/useSignup";
import GenderCheckbox from "./genderCheckBox";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./SignUp.css";

const SignUp = () => {
	const [inputs, setInputs] = useState({
		fullName: "",
		username: "",
		email: "",
		password: "",
		confirmPassword: "",
		gender: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const { loading, signup } = useSignup();

	const handleCheckboxChange = (gender) => {
		setInputs({ ...inputs, gender });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		await signup(inputs);
	};

	return (
		<div className="signup-container">
			<div className="signup-box">
				<h1 className="signup-title">
					Sιɠɳ Uρ ƚσ <span className="brand-name">ᑕOᑎᑎEᑕT🪢</span>
				</h1>

				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<label>Full Name</label>
						<input
							type="text"
							placeholder="Full Name"
							value={inputs.fullName}
							onChange={(e) => setInputs({ ...inputs, fullName: e.target.value })}
							required
						/>
					</div>

					<div className="form-group">
						<label>Username</label>
						<input
							type="text"
							placeholder="Username"
							value={inputs.username}
							onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
							required
						/>
					</div>

					<div className="form-group">
						<label>Email</label>
						<input
							type="email"
							placeholder="Email"
							value={inputs.email}
							onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
							required
						/>
					</div>

					<div className="form-group">
						<label>Password</label>
						<div className="password-wrapper">
							<input
								type={showPassword ? "text" : "password"}
								placeholder="Enter Password"
								value={inputs.password}
								onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
								required
							/>
							{inputs.password && (
								<span
									className="toggle-password"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? <FaEyeSlash /> : <FaEye />}
								</span>
							)}
						</div>
					</div>

					<div className="form-group">
						<label>Confirm Password</label>
						<div className="password-wrapper">
							<input
								type={showConfirmPassword ? "text" : "password"}
								placeholder="Confirm Password"
								value={inputs.confirmPassword}
								onChange={(e) =>
									setInputs({ ...inputs, confirmPassword: e.target.value })
								}
								required
							/>
							{inputs.confirmPassword && (
								<span
									className="toggle-password"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								>
									{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
								</span>
							)}
						</div>
					</div>

					<GenderCheckbox
						onCheckboxChange={handleCheckboxChange}
						selectedGender={inputs.gender}
					/>

					<Link to="/login" className="signup-link">
						Already have an account?
					</Link>

					<div>
<button
	type="submit"
	className={`signup-button ${loading ? "blurred-loading" : ""}`}
	disabled={loading}
>
	{loading ? (
		<span className="custom-spinner"></span>
	) : (
		"Sign Up"
	)}
</button>



					</div>
				</form>
			</div>
		</div>
	);
};

export default SignUp;
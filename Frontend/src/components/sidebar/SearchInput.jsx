import { useState, useEffect } from "react";
import { IoSearchSharp } from "react-icons/io5";
import toast from "react-hot-toast";
import useConversation from "../../zustand/useConversation";
import useGetConversations from "../../hooks/useGetConversations";
import { SEARCH_URL } from "../../Url";
import { useSocketContext } from "../../context/SocketContext"; // ✅ ADD THIS
import "./SearchInput.css";
import ProfileDropdown from "./ProfileDropdown"; // ✅ import your dropdown

const SearchInput = () => {
	const [search, setSearch] = useState("");
	const [user, setUser] = useState(null);
	const { setSelectedConversation } = useConversation();
	const { conversations } = useGetConversations();
    const { onlineUsers } = useSocketContext();
    const isOnline = user && onlineUsers.includes(user._id);


	useEffect(() => {
		const userData = localStorage.getItem("chat-user");
		if (userData) {
			try {
				setUser(JSON.parse(userData));
			} catch (e) {
				console.error("Error parsing user from localStorage", e);
			}
		}
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!search) return;
		if (search.length < 3) {
			return toast.error("Search term must be at least 3 characters long");
		}

		const existingConversation = conversations.find((c) =>
			c.fullName.toLowerCase().includes(search.toLowerCase())
		);

		if (existingConversation) {
			setSelectedConversation(existingConversation);
			setSearch("");
			return;
		}

		try {
			const response = await fetch(SEARCH_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({ username: search }),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success(data.message || "Contact added successfully!");
				window.location.reload();
			} else {
				toast.error(data.error || "Failed to add contact");
			}
		} catch (error) {
			console.error("Error adding contact:", error);
			toast.error("Something went wrong. Please try again.");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="search-form">
			<input
				type="text"
				placeholder="Search by username…"
				className="search-input"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>
			<button type="submit" className="search-button">
				<IoSearchSharp className="search-icon" />
			</button>

{user && (
  <div className="user-info1 ">
    <div className="user-avatar-container">
      {/* Wrap the image with ProfileDropdown */}
      <ProfileDropdown user={user} handleSignOut={() => console.log("Sign out")}>
        <img
          src={user.profilePic || "/default-avatar.png"}
          alt="Profile"
          className="user-avatar"
        />
        {isOnline && <span className="online-dot"></span>}
      </ProfileDropdown>
    </div>
    <span className="logged-user">{user.username}</span>
  </div>
)}


		</form>
	);
};

export default SearchInput;

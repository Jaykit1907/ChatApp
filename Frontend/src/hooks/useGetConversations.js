import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GET_CONVERSATION } from "../Url";

const useGetConversations = () => {
    const [loading, setLoading] = useState(false);
    const [conversations, setConversations] = useState([]);

    useEffect(() => {
        const getConversations = async () => {
            setLoading(true);
            try {
                // Fetch contacts for the logged-in user
             const res = await fetch(GET_CONVERSATION, {
            credentials: "include", // 🔥 this sends the cookie!
            });

                const data = await res.json();

                if (data.error) {
                    throw new Error(data.error);
                }
                setConversations(data);
                console.log(data);
            
            } catch (error) {
                toast.error(error.message);
            } finally {
                setLoading(false);
            }
        };

        getConversations();
    }, []);

    return { loading, conversations };
};

export default useGetConversations;

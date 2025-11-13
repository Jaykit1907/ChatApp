// src/hooks/useGetConversations.js
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { GET_CONVERSATION } from "../Url";
import { useSocketContext } from "../context/SocketContext";

const useGetConversations = () => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const { contactRefreshTrigger } = useSocketContext(); // NEW

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(GET_CONVERSATION, {
        credentials: "include",
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setConversations(data || []);
    } catch (error) {
      console.error("fetchConversations error:", error);
      toast.error(error.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // refetch when socket notifies a contact change
  useEffect(() => {
    if (contactRefreshTrigger > 0) {
      fetchConversations();
    }
  }, [contactRefreshTrigger, fetchConversations]);

  return {
    loading,
    conversations,
    refetch: fetchConversations,
    setConversations, // for optimistic updates if needed
  };
};

export default useGetConversations;

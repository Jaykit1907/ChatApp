import React from 'react';
import SearchInput from './SearchInput';
import Conversations from './Conversations';
import LogoutButton from './LogoutButton';

import MessageContainer from '../messages/MessageContainer';

const Sidebar = ({ onConversationClick }) => {  // Accept onConversationClick as a prop
  return (
    // <div className="flex flex-row overflow-hidden ">
    <div className='border-r border-slate-500 p-4 flex flex-col'>
      <SearchInput />
      <div className='divider px-3'></div>
      <Conversations onConversationClick={onConversationClick} />
      <LogoutButton />
    </div>
 
    //    <MessageContainer /> 
       
    // </div>
  );
};

export default Sidebar;

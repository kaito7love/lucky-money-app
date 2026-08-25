import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
// import "./App.css";
import Login from "./components/LixiAuth/LixiAuth";
import LixiHome from "./components/LixiHome/LixiHome";
import CreateRoom from "./components/CreateRoom/CreateRoom";
import ShareRoom from "./components/ShareRoom/ShareRoom";
import JoinRoom from "./components/JoinRoom/JoinRoom";
import Profile from "./components/Profile/Profile";
import ChatRoom from "./components/ChatRoom/ChatRoom";

function App() {
    return (
        <>
            {/* <Login /> */}
            {/* <LixiHome /> */}
            {/* <CreateRoom /> */}
            {/* <ShareRoom /> */}
            {/* <JoinRoom /> */}
            {/* <Profile /> */}
            <ChatRoom />
        </>
    );
}

export default App;

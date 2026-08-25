"use client";

import styles from "./ChatRoom.module.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageItem from "./MessageItem/MessageItem";
import LiXiEventCard from "./LiXiEventCard/LiXiEventCard";
import ChatInput from "./ChatInput/ChatInput";
import ActiveLixiCard from "./LiXiEventCard/ActiveLixiCard";
import LiXiCard from "./LiXiEventCard/LiXiCard";

const ChatRoom = () => {
    return (
        <div className={styles.container}>
            <ChatHeader
                title="Family Group - Tết 2026"
                members={12}
                avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuDeps3lMt9x3VkVqfN165zaLwImreFEed4zMwss4B9V_P2lmB9RNS0Xy_MQkXeg-Y9oGLHpsTh3HkrK0A1Kmpmg4XHgiTIuxRcITZZaFELtxIHRydhLdhFruRs1wjqLC1jcDmebkA8y2-5s6XFpe9YQcw5lm4_ccVjhQbKiWWlcxK-tNJZRYN8bHM4KhF64DNEnErqDpSq0q9uC_vbLcfbx6YcQvdy-TFjAeErMaDNAQHC_qkvcbf8dYnu_Hq_jcm_oMoFVIpgIfyLy"
            />

            <main className={styles.scrollArea}>
                <div className={styles.patternLayer} />

                <div className={styles.chatContent}>
                    <div className={styles.dateTag}>
                        <span>Jan 29, 2026 (Mùng 1)</span>
                    </div>

                    <LiXiEventCard />
                    <LiXiCard
                        senderName="Minh Pham"
                        packetName="Big Dragon Packet"
                        claimedCount={50}
                        totalCount={100}
                        message="Wishing you wealth and health!"
                        initialSeconds={299} // Tương đương 04:59
                        onOpen={() => alert("Chúc mừng năm mới!")}
                    />

                    <ActiveLixiCard
                        senderName="Minh Pham"
                        claimedCount={50}
                        totalCount={100}
                        message="Wishing you wealth and health!"
                        initialSeconds={299} // 4:59
                        onOpen={() => console.log("Lì xì opened!")}
                    />

                    <MessageItem
                        sender="Aunt Mai"
                        avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuDos-atx1S53cq1HjWz5pWE1dOwkKYH-3ZKOD4rpqCFWq_3XlVnxgIG7cpSj8g-OnRQQcH0uTCCPLdOhYEv7HZR152x4YV2ZSDCGsoyxranIj0uSKellVCYQiWF-4_6bCA0ctQZQzVyIpyXA3_8EkhWH8SRUYWANqvyNBnW58Sy-bM63h9l242g5ftRgnLGr4QWtkSZm6h92EJMQd2lmRQkiyvwJrprhcyLB2-iTBwr0g7hUgLd1B603HCnNOYlTdRnzPNLMjrEfp0L"
                        text="Chúc mừng năm mới cả nhà! Chúc mọi người vạn sự như ý! 🌸"
                    />

                    <div className={styles.systemNotify}>
                        <span className="material-symbols-outlined">
                            savings
                        </span>
                        Nguyen vừa nhận 50.000đ
                    </div>

                    <MessageItem
                        isMine
                        text="Chúc mừng năm mới! Con đang về rồi ạ."
                        status="Đã xem 10:42 AM"
                    />

                    <MessageItem
                        isMine
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuCBSS9qKe_UIbccpW-SxWupCRXziA5jJy7kH1_N_9r-9QRSXhuQ-kIK_nwNNoOnOek5utlCTi2GPiGVeSWYqoh75C2-Xu8WcaVPwOMCnNiOgYl0if4pZ50dk3RHmRocCLrdxJSd18Du6VZGDe5GaxgqlcXMjO915n7Z-vdmVm0dH6blcDI3GWuJJZ9fNSSS3gikQ950JVbN-N6KP2Gd60A6ZOx4NldWmN8Xtkh4ZlofPNECH59pP8nQ4qnxs3G8dlb8OTkI600aCfZU"
                    />
                </div>
            </main>

            <ChatInput />
        </div>
    );
};

export default ChatRoom;

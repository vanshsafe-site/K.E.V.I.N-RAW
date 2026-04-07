const synth = window.speechSynthesis;
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;

let isListeningForProblems = false;
let shouldStop = false;

// Array of supportive responses
// Array of supportive responses
const supportiveResponses = [
    "I understand your struggle, and I know you have the strength to overcome it.",
    "I’ve listened carefully, and I truly believe you have the power to get through this.",
    "I hear you, and I know this is hard, but I believe you can handle it.",
    "You’ve expressed yourself clearly. I understand, and I know you’re strong enough.",
    "I’ve heard your concerns. You are resilient, and I know you can do this.",
    "I acknowledge your feelings. Remember, you have the inner strength to prevail.",
    "I’m here, listening, and I believe you have what it takes to overcome this.",
    "Your words matter, and I know you can face this challenge.",
    "I understand, and you have the ability to push through this.",
    "I’ve heard everything, and I believe you are capable of handling this.",
    "Your strength shines through. I know you can get through this.",
    "I recognize your struggle, and I believe in your resilience.",
    "I understand what you’re facing, and I trust your ability to endure.",
    "You’re stronger than you realize, and I know you can manage this.",
    "I’ve heard you, and I have full faith in your ability to overcome it.",
    "You’ve shared your heart, and I believe you will find your way through this.",
    "I understand your feelings. You have the strength to rise above this.",
    "I hear your concerns, and I know you’ll navigate this with courage.",
    "I’ve listened, and I trust that you can conquer this challenge.",
    "I heard everything, and I know you are more capable than you think.",
    "I understand your difficulty, and I know you’ll triumph over it.",
    "I’m here with you, and I know you have the power to overcome this.",
    "I believe in you, and I know you’ll handle this with grace and strength.",
    "I recognize your struggle, and I know you’ll emerge victorious.",
    "I’ve listened to your worries, and I believe you will overcome them.",
    "You are not alone. I know you have the strength to get through this.",
    "I understand your concerns, and I believe in your ability to resolve them.",
    "I know it’s tough, but I have no doubt in your ability to succeed.",
    "You’ve been heard, and I trust you can move forward with confidence.",
    "I hear your challenges, and I know you have the resilience to beat them.",
    "I know this is hard, but you are capable of handling it.",
    "I listened closely, and I believe in your strength to prevail.",
    "Your challenges are real, but so is your strength to overcome them.",
    "I know you can face this with the courage you already possess.",
    "You are stronger than your struggles, and I believe in you.",
    "I heard you, and I trust you can push through this difficulty.",
    "I understand your pain, and I believe you’ll get past this.",
    "I recognize your challenge, and I know you can handle it.",
    "I’ve heard everything, and I know you have the power to persevere.",
    "I hear your struggle, and I trust in your ability to overcome it.",
    "I’ve listened to your heart, and I know you can rise above this.",
    "You’ve been heard, and I know you are resilient enough to cope.",
    "I trust that you will overcome this with the strength within you.",
    "I believe in you, and I know you can tackle this challenge.",
    "You have what it takes, and I know you’ll get through this.",
    "I’ve heard your concerns, and I trust in your strength to endure.",
    "I know you can face this obstacle and come out even stronger.",
    "I’ve heard everything, and I believe you can conquer this.",
    "You are capable of overcoming this, and I believe in you.",
    "I understand, and I know you have the courage to move forward.",
    "I’ve listened, and I know you can rise to meet this challenge.",
    "I trust in your ability to overcome this hurdle.",
    "I know you can do this, and I believe in your strength.",
    "I’ve heard you, and I know you can deal with this successfully.",
    "I believe in your ability to push through this struggle.",
    "You have the strength to manage this, and I believe in you.",
    "I know you can handle this with the strength you possess.",
    "I heard your concerns, and I know you can resolve them.",
    "You are resilient, and I believe you will overcome this.",
    "I’ve listened, and I believe you have the power to succeed.",
    "I trust that you will get through this with your strength.",
    "You are stronger than this challenge, and I know you’ll prevail.",
    "I know you have the ability to overcome this obstacle.",
    "You’ve been heard, and I know you can handle this.",
    "I trust in your strength to overcome this struggle.",
    "You are capable of overcoming this challenge.",
    "I believe you have the strength to triumph.",
    "I know you can conquer this, and I believe in you.",
    "You have the courage to face this, and I know you will.",
    "I’ve listened, and I know you can get through this.",
    "I trust in your ability to manage this challenge.",
    "I’ve heard everything, and I believe you can overcome it.",
    "You are strong enough to get through this.",
    "I know you can rise above this difficulty.",
    "I believe you have the resilience to win this battle.",
    "I trust you will overcome this with your inner strength.",
    "I know you’ll find a way through this.",
    "You are not alone, and I believe you can handle this.",
    "I know you have the power to overcome this challenge.",
    "I trust in your ability to succeed.",
    "You have the strength to face this and win.",
    "I believe in your courage to overcome this.",
    "I trust you can push through this difficulty.",
    "I know you are strong enough to beat this.",
    "I’ve heard your struggle, and I know you can handle it.",
    "You are capable of getting through this.",
    "I trust you’ll overcome this challenge.",
    "You have the resilience to handle this.",
    "I know you’ll rise above this.",
    "I believe in your strength and perseverance.",
    "I know you can face this and succeed.",
    "I believe in your ability to overcome.",
    "I’ve heard everything, and I trust you’ll prevail.",
    "You are strong and capable of overcoming this.",
    "I know you’ll make it through this challenge.",
    "I believe you can rise above this.",
    "I know you have the strength to succeed.",
    "You can overcome this, and I believe in you."
];

// Function to speak a given text
function speak(text, callback) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = callback || (() => {});
    synth.speak(utterance);
}

// Function to start or restart listening for user input
function startListening() {
    if (!shouldStop) {
        recognition.start();
        console.log("Listening...");
    }
}

// Function to handle recognition results
recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log("Heard:", transcript);

    if (!isListeningForProblems) {
        if (transcript.includes("yes")) {
            isListeningForProblems = true;
            speak("Okay, I am listening.", startListening);
        } else if (transcript.includes("exit")) {
            shouldStop = true;
            speak("Goodbye, Dear. Take care!", () => recognition.stop());
        } else if (transcript.includes("thanks")) {
            speak("You're welcome, Dear! I'm always here for you.", startListening);
        } else {
            speak("Please say 'yes' if you want me to listen, or 'exit' to quit.", startListening);
        }
    } else {
        if (transcript.includes("kevin stop")) {
            isListeningForProblems = false;
            const randomResponse = supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
            speak(randomResponse, () => {
                speak("Do you want me to continue listening?", startListening);
            });
        } else if (transcript.includes("exit")) {
            shouldStop = true;
            speak("Goodbye, Dear. Take care!", () => recognition.stop());
        } else {
            // Keep listening if no specific command is given
            startListening();
        }
    }
};

// Handle errors gracefully
recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    if (!shouldStop) {
        setTimeout(startListening, 1000); // Delay restart on error
    }
};

// Restart listening when recognition ends unexpectedly
recognition.onend = () => {
    if (!shouldStop) {
        startListening(); // Immediately restart listening
    } else {
        console.log("Stopped listening.");
    }
};

// Initial greeting and activation
speak("KEVIN Emotional Support Artificial Intelligence for listening activated. How are you?", () => {
    speak("Do you want me to listen to your problems?", startListening);
});

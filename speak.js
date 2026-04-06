// Initialize speech synthesis and speech recognition
const synth = window.speechSynthesis;
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false; // Stop recognition after each command

// List of soothing messages
const soothingMessages = [
    "Everything will be okay. You are stronger than you think.",
    "I'm here for you. You're not alone.",
    "Remember, tough times don't last, but tough people do.",
    "Take a deep breath. You've got this.",
    "You are loved, and you are enough.",
    "It's okay to not be okay sometimes, Dear.",
    "You matter, Dear, and your feelings are valid.",
    "Take things one step at a time, Dear.",
    "I’m here for you, Dear, and I care about you.",
    "It’s okay to take a break and breathe, Dear.",
    "Your strength is greater than you realize, Dear.",
    "This moment will pass, and you will get through it, Dear.",
    "It's okay to ask for help when you need it, Dear.",
    "You are worthy of love and kindness, Dear.",
    "Your struggles do not define you, Dear.",
    "You are doing the best you can, and that is enough, Dear.",
    "One day at a time, one moment at a time, Dear.",
    "Even the darkest moments pass, Dear.",
    "You are stronger than you think, Dear.",
    "It’s okay to rest and take care of yourself, Dear.",
    "You don’t have to face this alone, Dear.",
    "You are valued and appreciated, Dear.",
    "Healing is a journey, not a destination, Dear.",
    "Take a deep breath, and take things slow, Dear.",
    "You are more than your anxiety or depression, Dear.",
    "You deserve to feel better, and I believe you will, Dear.",
    "It’s okay to feel the way you do, Dear.",
    "Your feelings are valid, and it’s okay to express them, Dear.",
    "Sometimes, taking it moment by moment is enough, Dear.",
    "You are not a burden, you are important, Dear.",
    "You are allowed to take things at your own pace, Dear.",
    "What you’re feeling right now is temporary, Dear.",
    "It’s okay to have bad days, they don’t last forever, Dear.",
    "You don’t have to be perfect, just be yourself, Dear.",
    "I believe in your ability to heal and grow, Dear.",
    "It's okay to reach out for support when you need it, Dear.",
    "You deserve peace, and I’m here to help you find it, Dear.",
    "Take care of yourself, you are worth it, Dear.",
    "Your mental health is just as important as your physical health, Dear.",
    "You are deserving of love and compassion, Dear.",
    "I’m proud of the progress you’ve made, no matter how small it seems, Dear.",
    "It’s okay to ask for a pause and take time for yourself, Dear.",
    "Your journey is unique, and that’s okay, Dear.",
    "You don’t have to have all the answers right now, Dear.",
    "You are doing great, even if it doesn’t feel like it, Dear.",
    "You have already shown so much strength by facing this, Dear.",
    "Even in difficult times, you are capable of getting through it, Dear.",
    "Be gentle with yourself during tough moments, Dear.",
    "You are not defined by your struggles or challenges, Dear.",
    "It’s okay to lean on others for support, Dear.",
    "There is no rush, healing takes time, Dear.",
    "I’m here for you, anytime you need to talk, Dear.",
    "You are not weak for feeling the way you do, you’re human, Dear.",
    "You are capable of handling what comes your way, Dear.",
    "You are not your thoughts, you are much more, Dear.",
    "It’s okay to cry, it’s a sign of strength to feel, Dear.",
    "You deserve to be happy, and happiness will come, Dear.",
    "There’s no shame in needing time to heal, Dear.",
    "You are doing amazing by showing up each day, Dear.",
    "Your mental health is important, and you deserve to focus on it, Dear.",
    "You are not alone, and there’s support available to you, Dear.",
    "You’ve made it through every challenge so far, and you can keep going, Dear.",
    "Even in silence, you are heard and understood, Dear.",
    "Take your time to heal, there’s no timeline, Dear.",
    "You are allowed to rest and recover when needed, Dear.",
    "You’re allowed to take care of yourself first, Dear.",
    "You are allowed to feel however you feel, and that’s okay, Dear.",
    "Progress, no matter how small, is still progress, Dear.",
    "You don’t have to have it all figured out right now, Dear.",
    "Healing doesn’t happen overnight, and that’s perfectly okay, Dear.",
    "You are worthy of kindness and compassion from yourself and others, Dear.",
    "Every step forward, no matter how small, is worth celebrating, Dear.",
    "Your journey matters, and it’s okay to take it at your own pace, Dear.",
    "Your health, both mental and physical, comes first, Dear.",
    "It’s okay to be kind to yourself, even when things are tough, Dear.",
    "You have an amazing strength within you, Dear.",
    "You are not a failure because of your struggles, Dear.",
    "It’s okay to need time to rest and recharge, Dear.",
    "You are allowed to feel vulnerable, it’s part of being human, Dear.",
    "Even the smallest progress is still progress, and it’s important, Dear.",
    "You are doing the best you can, and that’s enough, Dear.",
    "Your efforts, no matter how small, are important and worthwhile, Dear.",
    "You have the strength to overcome any obstacles, Dear.",
    "Healing is not linear, and that’s completely okay, Dear.",
    "It’s okay to have ups and downs, as long as you keep going, Dear.",
    "Every day is a new opportunity for growth, no matter how small, Dear.",
    "You are not broken, you are just healing, Dear.",
    "It’s okay to ask for help, you don’t have to do it alone, Dear.",
    "Your mental health matters, and you are deserving of care, Dear.",
    "You are worthy of happiness, and that happiness will come back to you, Dear.",
    "You have come so far, even when it feels like you haven’t, Dear.",
    "You are brave for reaching out and facing what you’re going through, Dear.",
    "It’s okay to feel lost, it’s part of the healing process, Dear.",
    "Every step you take, no matter how small, brings you closer to healing, Dear.",
    "You are a survivor, and you have the strength to keep going, Dear.",
    "No feeling is permanent, even the tough ones will pass, Dear.",
    "You are more than enough, just as you are, Dear.",
    "It’s okay to be a work in progress, we all are, Dear.",
    "You’ve faced tough times before, and you’ve made it through, Dear.",
    "I believe in you, even on the days you don’t believe in yourself, Dear.",
    "You are deserving of support and care, Dear.",
    "You are not alone in this, and help is always available, Dear.",
    "It’s okay to give yourself a break when you need it, Dear.",
    "You are worthy of peace and calm in your life, Dear.",
    "Taking small steps is still progress, and that matters, Dear.",
    "You deserve to feel proud of yourself, even on the tough days, Dear.",
    "You are allowed to feel your emotions without judgment, Dear.",
    "It’s okay to take time for yourself, you deserve it, Dear.",
    "You are not your worst moments, you are so much more, Dear.",
    "Each day is a new chance for things to get better, Dear.",
    "You are allowed to grow and heal at your own pace, Dear.",
    "You deserve the same kindness and compassion you show others, Dear.",
    "It’s okay to ask for support when things get hard, Dear.",
    "You have already made so much progress, and it’s okay to be proud of that, Dear.",
    "You are not defined by your struggles or setbacks, Dear.",
    "Even on the hardest days, you are still moving forward, Dear.",
    "You are worthy of love, care, and understanding, Dear."
];

// Function to speak a given text
function speak(text, callback) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = callback || (() => {});
    synth.speak(utterance);
}

// Function to start listening for user input
function listen() {
    recognition.start();
    console.log("Listening...");

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Heard:", transcript);

        if (transcript.includes("help")) {
            speak("I'm here to help. Remember, you are stronger than you know.", listen);
        } else if (transcript.includes("keep talking")) {
            keepTalking();
        } else if (transcript.includes("thanks")) {
            speak("You're welcome, Dear! I'm always here for you.", listen);
        } else if (transcript.includes("exit")) {
            speak("Goodbye, Dear. Take care!", () => recognition.stop());
        } else {
            speak("Sorry, I didn't understand that. Please say 'help', 'keep talking', 'thanks', or 'exit'.", listen);
        }
    };

    recognition.onerror = (event) => {
        console.error("Error occurred in recognition:", event.error);
    };

    recognition.onend = () => {
        console.log("Stopped listening.");
    };
}

// Function to deliver one soothing message at a time
function keepTalking() {
    const randomMessage = soothingMessages[Math.floor(Math.random() * soothingMessages.length)];
    speak(randomMessage, listen);
}

// Initial greeting and activation
speak("KEVIN Emotional Support Artificial Intelligence for speaking activated. How are you?", () => {
    speak("How can I assist you?", listen);
});

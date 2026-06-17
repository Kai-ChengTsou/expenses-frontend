// Add to Home Screen functionality
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Create and show the Add to Home button
    const addToHomeBtn = document.createElement('button');
    addToHomeBtn.className = 'add-to-home';
    addToHomeBtn.innerHTML = '+';
    addToHomeBtn.title = 'Add to Home Screen';
    document.body.appendChild(addToHomeBtn);
    
    addToHomeBtn.addEventListener('click', () => {
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            // Clear the saved prompt since it can't be used again
            deferredPrompt = null;
            
            // Hide the button
            addToHomeBtn.classList.add('hidden');
        });
    });
});

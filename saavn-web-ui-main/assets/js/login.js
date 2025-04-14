document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // This is a simple client-side demonstration.
    // For production, validate against a backend server.
    if(username === 'user' && password === 'pass') {
      // Set a simple session flag. In a real app, use cookies, tokens, or session management.
      localStorage.setItem('isLoggedIn', 'true');
      // Redirect to your music player page (index.html)
      window.location.href = './saavn-web-ui-main/index.html';

    } else {
      alert('Invalid credentials. Please try again.');
    }
  });
  
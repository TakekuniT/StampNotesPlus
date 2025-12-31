// popup.js
// Wait for everything to load
let supabaseClient;
let appInitialized = false;

// Initialize Supabase client (singleton pattern)
function initSupabase() {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient;
  }
  
  if (typeof supabase === 'undefined') {
    console.error('Supabase not loaded yet');
    return null;
  }
  
  const { createClient } = supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}

// Initialize app only once
function initializeApp() {
  // Prevent multiple initializations
  if (appInitialized) {
    return;
  }
  appInitialized = true;

  const loginForm = document.getElementById('loginForm');
  const userInfo = document.getElementById('userInfo');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const signUpBtn = document.getElementById('signUpBtn');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const messageDiv = document.getElementById('message');
  const userEmailSpan = document.getElementById('userEmail');
  const userNumberSpan = document.getElementById('userNumber');

  // Check if already logged in
  checkAuth();

  async function checkAuth() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        showUserInfo(user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  }

  async function signUp() {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
      showMessage('Please enter email and password', 'error');
      return;
    }
    
    try {
      signUpBtn.disabled = true;
      signUpBtn.textContent = 'Creating...';
      
      // Create auth account
      // Create auth account
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/confirm' // For development
          // Change to 'https://yourdomain.com/auth/confirm' when you deploy
        }
      });
      
      if (error) throw error;
      
      // Get user number (check how many users exist)
      const { count } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      const userNumber = (count || 0) + 1;
      const isFree = userNumber <= 100;
      
      // Create user record
      const { error: dbError } = await supabaseClient
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          user_number: userNumber,
          is_free: isFree
        });
      
      if (dbError) throw dbError;
      
      showMessage(`Account created! You're user #${userNumber}${isFree ? ' - FREE!' : ''}`, 'success');
      showUserInfo(data.user);
      
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      signUpBtn.disabled = false;
      signUpBtn.textContent = 'Create Account';
    }
  }

  async function signIn() {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
      showMessage('Please enter email and password', 'error');
      return;
    }
    
    try {
      signInBtn.disabled = true;
      signInBtn.textContent = 'Signing in...';
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      showUserInfo(data.user);
      
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      signInBtn.disabled = false;
      signInBtn.textContent = 'Sign In';
    }
  }

  async function signOut() {
    await supabaseClient.auth.signOut();
    loginForm.classList.remove('hidden');
    userInfo.classList.add('hidden');
    emailInput.value = '';
    passwordInput.value = '';
  }

  async function showUserInfo(user) {
    try {
      // Get user data from our table
      const { data } = await supabaseClient
        .from('users')
        .select('email, user_number, is_free')
        .eq('id', user.id)
        .single();
      
      if (data) {
        userEmailSpan.textContent = data.email;
        userNumberSpan.textContent = data.user_number;
      } else {
        userEmailSpan.textContent = user.email;
      }
      
      loginForm.classList.add('hidden');
      userInfo.classList.remove('hidden');
    } catch (error) {
      console.error('Error loading user info:', error);
      userEmailSpan.textContent = user.email;
      loginForm.classList.add('hidden');
      userInfo.classList.remove('hidden');
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove('hidden');
    setTimeout(() => {
      messageDiv.classList.add('hidden');
    }, 3000);
  }

  signUpBtn.addEventListener('click', signUp);
  signInBtn.addEventListener('click', signIn);
  signOutBtn.addEventListener('click', signOut);
}

// Single initialization point
window.addEventListener('load', () => {
  supabaseClient = initSupabase();
  if (!supabaseClient) {
    console.error('Failed to initialize Supabase');
    return;
  }
  initializeApp();
});
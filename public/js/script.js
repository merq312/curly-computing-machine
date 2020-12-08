/* eslint-disable */

export const hideAlert = () => {
  const el = document.querySelector('.alert')
  if (el) {
    el.parentElement.removeChild(el)
  }
}

// type is 'success' or 'error'
const showAlert = (type, msg) => {
  hideAlert()

  const markup = `<div class="alert alert--${type}">${msg}</div>`
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup)

  window.setTimeout(hideAlert, 5000)
}

const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://localhost:3000/api/v1/users/login',
      withCredentials: true,
      data: {
        email,
        password,
      },
    })

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!')
      // console.log(res.data)
      // console.log(document.cookie)
      window.setTimeout(() => {
        location.assign('/')
      }, 1500)
    }
  } catch (err) {
    showAlert('error', err.response.data.message)
  }
}

const logout = async () => {
  console.log('LOGOUT')
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://localhost:3000/api/v1/users/logout',
      withCredentials: true,
    })

    if (res.data.status === 'success') {
      location.reload()
    }
  } catch (err) {
    showAlert('error', 'Error logging out, try again.')
  }
}

// type is either 'password' or 'data'
const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? 'http://localhost:3000/api/v1/users/updateMyPassword'
        : 'http://localhost:3000/api/v1/users/updateMe'
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    })

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`)
    }
  } catch (err) {
    showAlert('error', err.response.data.message)
  }
}

// ***

const stripe = Stripe(
  'pk_test_51HvoKqC8CJDMYZ5I40cMMDAWnS6YeX6ecdo5n3bDE4qmXW3oNpGG696bEllNPkkFI2wBMWVv3pwZe9TAJpBx9VJW00m5iNTNLG'
)

export const bookTour = async (tourId) => {
  try {
    // Get checkout session from API
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    )
    // console.log(session)

    // Create checkout form and charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    })
  } catch (err) {
    console.log(err)
    showAlert('error', err)
  }
}

// ***

const loginForm = document.querySelector('.form--login')
const logoutBtn = document.querySelector('.nav__el--logout')
const userDataForm = document.querySelector('.form-user-data')
const userPasswordForm = document.querySelector('.form-user-password')
const bookBtn = document.getElementById('book-tour')

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    login(email, password)
  })
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout)
}

if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const form = new FormData()
    form.append('name', document.getElementById('name').value)
    form.append('email', document.getElementById('email').value)
    form.append('photo', document.getElementById('photo').files[0])

    updateSettings(form, 'data')
  })
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    document.querySelector('.btn--save-password').textContent = 'Updating...'

    const passwordCurrent = document.getElementById('password-current').value
    const password = document.getElementById('password').value
    const passwordConfirm = document.getElementById('password-confirm').value
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    )

    document.querySelector('.btn--save-password').textContent = 'Save password'
    document.getElementById('password-current').value = ''
    document.getElementById('password').value = ''
    document.getElementById('password-confirm').value = ''
  })
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...'
    const tourId = e.target.dataset.tourId
    bookTour(tourId)
  })
}

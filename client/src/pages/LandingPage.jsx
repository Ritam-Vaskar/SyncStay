import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Hotel, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  Globe,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Star,
  Menu,
  X,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });

  const features = [
    {
      icon: Globe,
      title: 'Event Microsites',
      description: 'Auto-generated branded microsites for each event with unique URLs and custom themes.'
    },
    {
      icon: Users,
      title: 'Guest Self-Service',
      description: 'Guests book accommodations directly through microsites with real-time availability.'
    },
    {
      icon: CheckCircle,
      title: 'Smart Approvals',
      description: 'Planners approve guest bookings with one click. No admin interference needed.'
    },
    {
      icon: Hotel,
      title: 'Inventory Management',
      description: 'Manage hotel rooms, pricing, and availability across multiple properties effortlessly.'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track bookings, revenue, occupancy rates, and guest data with live dashboards.'
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security with role-based access control and audit logging.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Event Director, TechCorp',
      image: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=667eea&color=fff',
      content: 'StaySync transformed how we manage accommodations for our annual conferences. The microsite feature alone saved us 20+ hours per event!'
    },
    {
      name: 'Michael Chen',
      role: 'Wedding Planner, Elegant Events',
      image: 'https://ui-avatars.com/api/?name=Michael+Chen&background=764ba2&color=fff',
      content: 'Our clients love the branded microsites. It adds a professional touch and makes booking rooms effortless for wedding guests.'
    },
    {
      name: 'Jessica Williams',
      role: 'HR Manager, Global Inc',
      image: 'https://ui-avatars.com/api/?name=Jessica+Williams&background=f093fb&color=fff',
      content: 'Managing hotel blocks for corporate events was always a headache. StaySync made it simple with approval workflows and real-time tracking.'
    }
  ];

  const stats = [
    { label: 'Events Managed', value: '10,000+' },
    { label: 'Bookings Processed', value: '50,000+' },
    { label: 'Happy Planners', value: '2,500+' },
    { label: 'Hotel Partners', value: '500+' }
  ];

  const handleBookDemo = (e) => {
    e.preventDefault();
    alert(`Thank you ${demoForm.name}! We'll contact you at ${demoForm.email} to schedule your demo.`);
    setDemoForm({ name: '', email: '', company: '', phone: '' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-2 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                StaySync
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary-600 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-gray-600 hover:text-primary-600 transition-colors">Testimonials</a>
              <a href="#contact" className="text-gray-600 hover:text-primary-600 transition-colors">Contact</a>
              {isAuthenticated ? (
                <Link 
                  to={user?.role === 'hotel' ? '/hotel/dashboard' : '/dashboard'} 
                  className="btn btn-primary"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-primary-600 transition-colors">Login</Link>
                  <Link to="/register" className="btn btn-primary">Get Started</Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-600"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-4">
              <a href="#features" className="block text-gray-600 hover:text-primary-600">Features</a>
              <a href="#how-it-works" className="block text-gray-600 hover:text-primary-600">How It Works</a>
              <a href="#testimonials" className="block text-gray-600 hover:text-primary-600">Testimonials</a>
              <a href="#contact" className="block text-gray-600 hover:text-primary-600">Contact</a>
              {isAuthenticated ? (
                <Link 
                  to={user?.role === 'hotel' ? '/hotel/dashboard' : '/dashboard'} 
                  className="btn btn-primary w-full"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="block text-gray-600 hover:text-primary-600">Login</Link>
                  <Link to="/register" className="btn btn-primary w-full">Get Started</Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
                <Zap className="h-4 w-4 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">Trusted by 2,500+ Event Planners</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Simplify Event
                <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"> Accommodation </span>
                Management
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Create branded microsites, manage hotel inventory, and let guests book their own rooms. 
                All while you maintain full control with smart approval workflows.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="btn btn-primary btn-lg flex items-center justify-center gap-2">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#demo" className="btn btn-lg bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 flex items-center justify-center gap-2">
                  Book a Demo
                </a>
              </div>
              <p className="text-sm text-gray-500 mt-4">No credit card required • 14-day free trial</p>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <img 
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop" 
                  alt="Event Management Dashboard"
                  className="rounded-lg w-full"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Approved</p>
                    <p className="font-bold text-gray-900">in 2 seconds</p>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-primary-600" />
                    <span className="font-semibold">+45% Efficiency</span>
                  </div>
                  <p className="text-xs text-gray-600">vs traditional methods</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-4xl font-bold text-primary-600 mb-2">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Events
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to save you time and delight your guests
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-xl transition-shadow">
                <div className="bg-primary-100 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How StaySync Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From event creation to guest check-in, in just 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Create Event', desc: 'Set up your event with dates, location, and requirements' },
              { step: '2', title: 'Get Approved', desc: 'Admin reviews and auto-generates your branded microsite' },
              { step: '3', title: 'Share Link', desc: 'Send the unique microsite URL to your guests' },
              { step: '4', title: 'Approve Bookings', desc: 'Review and approve guest bookings with one click' }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-300 to-purple-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-primary-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Event Professionals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our customers have to say about StaySync
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-xl transition-shadow">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.content}</p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Event Management?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of event planners who have streamlined their accommodation management with StaySync
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100 flex items-center justify-center gap-2">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a href="#demo" className="btn btn-lg bg-transparent border-2 border-white text-white hover:bg-white/10 flex items-center justify-center gap-2">
              Schedule Demo
            </a>
          </div>
        </div>
      </section>

      {/* Demo Form Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Book Your Personal Demo
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  See StaySync in action with a personalized demo tailored to your event management needs.
                </p>
                <ul className="space-y-4">
                  {[
                    'Live walkthrough of all features',
                    'Customized to your use case',
                    'Q&A with our product experts',
                    'No commitment required'
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-8">
                <form onSubmit={handleBookDemo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      className="input"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      className="input"
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input
                      type="text"
                      value={demoForm.company}
                      onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                      className="input"
                      placeholder="Your Company"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={demoForm.phone}
                      onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                      className="input"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full">
                    Book Demo
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have questions? We're here to help you get started with StaySync
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600">support@staysync.com</p>
              <p className="text-gray-600">sales@staysync.com</p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600">+1 (555) 123-4567</p>
              <p className="text-sm text-gray-500">Mon-Fri 9AM-6PM EST</p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Visit Us</h3>
              <p className="text-gray-600">123 Event Street</p>
              <p className="text-gray-600">San Francisco, CA 94102</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">StaySync</span>
              </div>
              <p className="text-gray-400">
                Simplifying event accommodation management for planners worldwide.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
                <li><Link to="/register" className="hover:text-white">Pricing</Link></li>
                <li><a href="#demo" className="hover:text-white">Book Demo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#contact" className="hover:text-white">About Us</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2026 StaySync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

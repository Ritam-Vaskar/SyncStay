import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Hotel, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  Globe,
  Shield,
  BarChart3,
  ArrowRight,
  Star,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { EventRecommendations } from '../components/EventRecommendations';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', company: '', phone: '' });

  const features = [
    {
      icon: Globe,
      title: 'Event Microsites',
      description: 'Auto-generated branded microsites for each event with unique URLs and custom themes.',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      icon: Users,
      title: 'Guest Self-Service',
      description: 'Guests book accommodations directly through microsites with real-time availability.',
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      icon: CheckCircle,
      title: 'Smart Approvals',
      description: 'Planners approve guest bookings with one click. No admin interference needed.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Hotel,
      title: 'Inventory Management',
      description: 'Manage hotel rooms, pricing, and availability across multiple properties effortlessly.',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track bookings, revenue, occupancy rates, and guest data with live dashboards.',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security with role-based access control and audit logging.',
      color: 'text-slate-600',
      bg: 'bg-slate-50',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Event Director, TechCorp',
      image: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=4f46e5&color=fff',
      content: 'StaySync transformed how we manage accommodations for our annual conferences. The microsite feature alone saved us 20+ hours per event!'
    },
    {
      name: 'Michael Chen',
      role: 'Wedding Planner, Elegant Events',
      image: 'https://ui-avatars.com/api/?name=Michael+Chen&background=0ea5e9&color=fff',
      content: 'Our clients love the branded microsites. It adds a professional touch and makes booking rooms effortless for wedding guests.'
    },
    {
      name: 'Jessica Williams',
      role: 'HR Manager, Global Inc',
      image: 'https://ui-avatars.com/api/?name=Jessica+Williams&background=6366f1&color=fff',
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
    <div className="min-h-screen bg-white text-gray-900 transition-colors duration-300">

      {/* â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">StaySync</span>
            </div>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Testimonials</a>
              <Link to="/events" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Browse Events</Link>
            </div>

            {/* Auth CTA */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link to={user?.role === 'hotel' ? '/hotel/dashboard' : '/dashboard'}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-2">Log in</Link>
                  <Link to="/register" className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
              <a href="#features" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Features</a>
              <a href="#how-it-works" className="block text-sm text-gray-600 hover:text-gray-900 py-1">How It Works</a>
              <a href="#testimonials" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Testimonials</a>
              <Link to="/events" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Browse Events</Link>
              <div className="pt-2 space-y-2">
                <Link to="/login" className="block text-center py-2 text-sm text-gray-700 border border-gray-200 rounded-lg">Log in</Link>
                <Link to="/register" className="block text-center py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg">Get Started</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="pt-28 pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                Trusted by 2,500+ Event Planners
              </div>

              <h1 className="text-5xl lg:text-[3.4rem] font-bold text-gray-900 leading-[1.08] tracking-tight mb-6">
                Simplify Event<br />
                <span className="text-indigo-600">Accommodation</span><br />
                Management
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed max-w-lg mb-10">
                Create branded microsites, manage hotel inventory, and let guests book
                their own rooms. All while you maintain full control with smart approval
                workflows.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <Link to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#demo"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  Book a Demo
                </a>
              </div>
              <p className="text-xs text-gray-400">No credit card required · 14-day free trial</p>
            </div>

            {/* Right: Image with floating stat cards */}
            <div className="relative">

              {/* Floating top-right card */}
              <div className="absolute -top-6 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 min-w-[190px]">
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingUp className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  <span className="text-sm font-bold text-gray-900">+45% Efficiency</span>
                </div>
                <p className="text-xs text-gray-500">vs traditional methods</p>
              </div>

              {/* Main image */}
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-200/60">
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&h=640&fit=crop&crop=center"
                  alt="Event accommodation management"
                  className="w-full h-[430px] object-cover"
                />
              </div>

              {/* Floating bottom-left card */}
              <div className="absolute -bottom-6 left-4 z-10 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Booking Approved</p>
                  <p className="text-sm font-bold text-gray-900">in 2 seconds</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-16 border-y border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-3xl font-bold text-indigo-600 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Event Recommendations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <EventRecommendations />

      {/* â”€â”€ Features â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Everything you need to run flawless events
            </h2>
            <p className="text-gray-500 text-lg">
              Powerful tools that save you time and delight your guests.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md transition-all duration-200">
                <div className={`w-11 h-11 rounded-lg ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ How It Works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Up and running in 4 simple steps
            </h2>
            <p className="text-gray-500 text-lg">
              From event creation to guest check-in, it's effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Create Event', desc: 'Set up your event with dates, location, and requirements.' },
              { step: '02', title: 'Auto-Publish', desc: 'Your branded microsite is generated and published instantly.' },
              { step: '03', title: 'Share Link', desc: 'Send the unique microsite URL to your guests via email.' },
              { step: '04', title: 'Approve Bookings', desc: 'Review and confirm guest bookings with a single click.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-xl border border-gray-100 p-6 h-full">
                  <span className="text-4xl font-black text-indigo-100 select-none">{item.step}</span>
                  <h3 className="text-base font-bold text-gray-900 mt-3 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:flex absolute top-8 -right-3.5 z-10">
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Testimonials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Loved by event professionals
            </h2>
            <p className="text-gray-500 text-lg">
              Don't take our word for it â€” here's what our customers say.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">"{t.content}"</p>
                <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
                  <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ CTA Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Ready to transform your event management?
          </h2>
          <p className="text-indigo-200 mb-8 max-w-xl mx-auto">
            Join thousands of planners who have streamlined accommodation management with StaySync.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-indigo-400 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
              Schedule Demo
            </a>
          </div>
        </div>
      </section>

      {/* â”€â”€ Demo Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="demo" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Book a Demo</p>
                <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                See StaySync in action
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Get a personalized walkthrough tailored to your event management needs.
              </p>
              <ul className="space-y-3">
                {[
                  'Live walkthrough of all features',
                  'Customized to your use case',
                  'Q&A with our product experts',
                  'No commitment required',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-7">
              <form onSubmit={handleBookDemo} className="space-y-4">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe', required: true },
                  { label: 'Work Email', key: 'email', type: 'email', placeholder: 'john@company.com', required: true },
                  { label: 'Company', key: 'company', type: 'text', placeholder: 'Your Company', required: false },
                  { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+1 (555) 000-0000', required: false },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      value={demoForm[field.key]}
                      onChange={(e) => setDemoForm({ ...demoForm, [field.key]: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
                <button type="submit"
                  className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors mt-2">
                  Book Demo
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Contact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="contact" className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Get in touch</h2>
            <p className="text-gray-500">Have questions? We're here to help you get started.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Mail, label: 'Email Us', lines: ['support@staysync.com', 'sales@staysync.com'] },
              { icon: Phone, label: 'Call Us', lines: ['+1 (555) 123-4567', 'Monâ€“Fri 9AMâ€“6PM EST'] },
              { icon: MapPin, label: 'Visit Us', lines: ['123 Event Street', 'San Francisco, CA 94102'] },
            ].map((c, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-6 text-center">
                <div className="w-11 h-11 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <c.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{c.label}</h3>
                {c.lines.map((l, j) => (
                  <p key={j} className="text-sm text-gray-500">{l}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="bg-gray-900 text-gray-400 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-bold tracking-tight">StaySync</span>
              </div>
              <p className="text-sm leading-relaxed">
                Simplifying event accommodation management for planners worldwide.
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: [
                  { label: 'Features', href: '#features' },
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Book Demo', href: '#demo' },
                ],
              },
              {
                title: 'Company',
                links: [
                  { label: 'About Us', href: '#contact' },
                  { label: 'Contact', href: '#contact' },
                  { label: 'Careers', href: '#' },
                ],
              },
              {
                title: 'Legal',
                links: [
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Terms of Service', href: '#' },
                  { label: 'Cookie Policy', href: '#' },
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-white text-sm font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l, j) => (
                    <li key={j}>
                      <a href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-xs">
            <p>&copy; 2026 StaySync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

const Header = () => {
  return (
    <div className="flex justify-between items-center p-4 text-white">
      <div className="flex items-center gap-4 ">
        <div className="w-32 h-32">
          <Link to="/">
            <img src={logo} alt="logo" className="w-full h-full object-cover" />
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-10 text-xl ">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/contact-us">Contact Us</Link>
      </div>
      <div className="flex items-center gap-4 ">
        <button className="bg-indigo-500 text-white px-4 py-2 rounded-md">
          <Link to="/login">Login</Link>
        </button>
        <button className="bg-indigo-500 text-white px-4 py-2 rounded-md">
          <Link to="/register">Get Started</Link>
        </button>
      </div>
    </div>
  );
};
export default Header;

import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Header = () => {
    return (
        <div className="flex justify-between items-center p-4 text-white">
            <div className="flex items-center gap-4 ">
                <div className="w-20 h-20">
                    <Link to="/">
                        <img src={logo} alt="logo" className="w-full h-full object-cover" />
                    </Link>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Link to="/">Home</Link>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>

            </div>
        </div>
    )
}
export default Header;
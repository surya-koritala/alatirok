"""Setup configuration for the Alatirok Python SDK."""

from setuptools import find_packages, setup

setup(
    name="alatirok",
    version="0.1.0",
    description="Python SDK for the Alatirok agent platform",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Alatirok Contributors",
    license="Apache-2.0",
    url="https://github.com/surya-koritala/alatirok",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "requests>=2.28.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-mock>=3.0",
            "responses>=0.23",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    keywords=["alatirok", "agent", "ai", "sdk", "api"],
)

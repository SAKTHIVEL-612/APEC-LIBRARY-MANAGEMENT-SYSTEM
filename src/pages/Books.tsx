import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Book } from '../types';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  BookOpen,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const Books: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    quantityTotal: 1,
    shelfLocation: '',
    description: '',
    coverImage: '',
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const booksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setBooks(booksData);
    } catch (error) {
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        setFormData(prev => ({ ...prev, coverImage: data.url }));
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBook = {
        ...formData,
        quantityAvailable: formData.quantityTotal,
        createdAt: new Date(),
      };
      await addDoc(collection(db, 'books'), newBook);
      toast.success('Book added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchBooks();
    } catch (error) {
      toast.error('Failed to add book');
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      const updatedBook = {
        ...formData,
        // Adjust available quantity if total changed
        quantityAvailable: formData.quantityTotal - (editingBook.quantityTotal - editingBook.quantityAvailable),
      };
      await updateDoc(doc(db, 'books', editingBook.id), updatedBook);
      toast.success('Book updated successfully!');
      setEditingBook(null);
      resetForm();
      fetchBooks();
    } catch (error) {
      toast.error('Failed to update book');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await deleteDoc(doc(db, 'books', id));
      toast.success('Book deleted successfully!');
      fetchBooks();
    } catch (error) {
      toast.error('Failed to delete book');
    }
  };

  const handleRequestBook = async (book: Book, type: 'borrow' | 'request' = 'borrow') => {
    try {
      await addDoc(collection(db, 'requests'), {
        userUid: user?.uid,
        userName: user?.name,
        bookId: book.id,
        bookTitle: book.title,
        type,
        status: 'pending',
        createdAt: new Date(),
      });
      
      // Also create a notification for admin
      await addDoc(collection(db, 'notifications'), {
        userUid: 'admin',
        message: `New ${type} request for "${book.title}" from ${user?.name}`,
        type: 'request',
        isRead: false,
        createdAt: new Date(),
      });

      toast.success(`${type === 'borrow' ? 'Borrow' : 'Book'} request submitted!`);
      setSelectedBook(null);
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  const [seeding, setSeeding] = useState(false);

  const seedBooks = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can seed books.');
      return;
    }
    setSeeding(true);
    console.log('Starting to seed engineering books using batch...');
    try {
      const { writeBatch, doc, collection } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      const engineeringBooks = [
        { title: "Introduction to Civil Engineering", author: "Chen-Wai Fah", isbn: "978-0134651644", category: "Engineering", publisher: "Pearson", quantityTotal: 5, shelfLocation: "A1", description: "Foundational concepts of civil engineering." },
        { title: "Mechanical Engineering Principles", author: "John Bird", isbn: "978-1138781573", category: "Engineering", publisher: "Routledge", quantityTotal: 3, shelfLocation: "B2", description: "Core principles of mechanical systems." },
        { title: "Electrical Engineering: Concepts and Applications", author: "S.A. Reza Zekavat", isbn: "978-0132539180", category: "Engineering", publisher: "Pearson", quantityTotal: 4, shelfLocation: "C3", description: "Comprehensive guide to electrical engineering." },
        { title: "Chemical Engineering Design", author: "Gavin Towler", isbn: "978-0080966595", category: "Engineering", publisher: "Elsevier", quantityTotal: 2, shelfLocation: "D4", description: "Principles, practice and economics of plant and process design." },
        { title: "Structural Analysis", author: "Russell C. Hibbeler", isbn: "978-0133942842", category: "Engineering", publisher: "Pearson", quantityTotal: 6, shelfLocation: "A2", description: "Theory and application of structural analysis." },
        { title: "Thermodynamics: An Engineering Approach", author: "Yunus Cengel", isbn: "978-0073398174", category: "Engineering", publisher: "McGraw-Hill", quantityTotal: 5, shelfLocation: "B1", description: "Fundamental principles of thermodynamics." },
        { title: "Fluid Mechanics", author: "Frank White", isbn: "978-0073398273", category: "Engineering", publisher: "McGraw-Hill", quantityTotal: 4, shelfLocation: "B3", description: "Study of fluids and their properties." },
        { title: "Materials Science and Engineering", author: "William Callister", isbn: "978-1118324578", category: "Engineering", publisher: "Wiley", quantityTotal: 3, shelfLocation: "C1", description: "Introduction to materials science." },
        { title: "Control Systems Engineering", author: "Norman Nise", isbn: "978-1118170519", category: "Engineering", publisher: "Wiley", quantityTotal: 4, shelfLocation: "C2", description: "Analysis and design of control systems." },
        { title: "Digital Logic and Computer Design", author: "M. Morris Mano", isbn: "978-0132145138", category: "Engineering", publisher: "Pearson", quantityTotal: 5, shelfLocation: "E1", description: "Fundamentals of digital systems." },
        { title: "Environmental Engineering: Science and Practice", author: "Mackenzie Davis", isbn: "978-0073401140", category: "Engineering", publisher: "McGraw-Hill", quantityTotal: 3, shelfLocation: "D1", description: "Principles of environmental protection." },
        { title: "Aerospace Engineering: From Ground Up", author: "Ben Lawrence", isbn: "978-1498756457", category: "Engineering", publisher: "CRC Press", quantityTotal: 2, shelfLocation: "F1", description: "Introduction to aerospace systems." },
        { title: "Biomedical Engineering Fundamentals", author: "Joseph Bronzino", isbn: "978-0849321214", category: "Engineering", publisher: "CRC Press", quantityTotal: 2, shelfLocation: "G1", description: "Core concepts of biomedical engineering." },
        { title: "Industrial Engineering and Management", author: "O.P. Khanna", isbn: "978-8174090546", category: "Engineering", publisher: "Dhanpat Rai", quantityTotal: 4, shelfLocation: "H1", description: "Management principles for engineers." },
        { title: "Software Engineering: A Practitioner's Approach", author: "Roger Pressman", isbn: "978-0078022128", category: "Engineering", publisher: "McGraw-Hill", quantityTotal: 8, shelfLocation: "E2", description: "Comprehensive guide to software engineering." },
        { title: "Geotechnical Engineering: Principles and Practices", author: "Donald Coduto", isbn: "978-0132368681", category: "Engineering", publisher: "Pearson", quantityTotal: 3, shelfLocation: "A3", description: "Soil mechanics and foundation engineering." },
        { title: "Transportation Engineering: Planning and Design", author: "Paul Wright", isbn: "978-0471446101", category: "Engineering", publisher: "Wiley", quantityTotal: 3, shelfLocation: "A4", description: "Planning and design of transport systems." },
        { title: "Robotics: Modelling, Planning and Control", author: "Bruno Siciliano", isbn: "978-1846286414", category: "Springer", publisher: "Springer", quantityTotal: 2, shelfLocation: "I1", description: "Advanced robotics principles." },
        { title: "Renewable Energy Engineering", author: "Nicholas Jenkins", isbn: "978-1107680227", category: "Engineering", publisher: "Cambridge", quantityTotal: 4, shelfLocation: "J1", description: "Sustainable energy technologies." },
        { title: "Nanotechnology: Principles and Practices", author: "Sulabha Kulkarni", isbn: "978-3319091709", category: "Engineering", publisher: "Springer", quantityTotal: 2, shelfLocation: "K1", description: "Introduction to nanoscale science." }
      ];

      for (const book of engineeringBooks) {
        const bookRef = doc(collection(db, 'books'));
        batch.set(bookRef, {
          ...book,
          quantityAvailable: book.quantityTotal,
          coverImage: `https://picsum.photos/seed/${book.isbn}/400/600`,
          createdAt: new Date()
        });
      }

      await batch.commit();
      console.log('Batch commit successful.');
      toast.success('20 Engineering books added successfully!');
      fetchBooks();
    } catch (error: any) {
      console.error('Error seeding books:', error);
      toast.error(`Failed to seed books: ${error.message || 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      publisher: '',
      quantityTotal: 1,
      shelfLocation: '',
      description: '',
      coverImage: '',
    });
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Library Books</h1>
          <p className="text-slate-500 text-sm">Manage and discover books in the library</p>
        </div>
        {isAdmin && (
          <div className="flex items-center space-x-3">
            <button
              onClick={seedBooks}
              disabled={seeding}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <BookOpen size={20} />
              )}
              <span>{seeding ? 'Adding...' : 'Seed Engineering Books'}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition-all"
            >
              <Plus size={20} />
              <span>Add New Book</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
        </div>
        <button className="bg-white border border-slate-200 px-4 py-3 rounded-xl flex items-center space-x-2 text-slate-600 hover:bg-slate-50 transition-all">
          <Filter size={20} />
          <span>Filters</span>
        </button>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <div 
              key={book.id} 
              onClick={() => !isAdmin && setSelectedBook(book)}
              className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-all ${!isAdmin ? 'cursor-pointer' : ''}`}
            >
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                {book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <BookOpen size={64} />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    book.quantityAvailable > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {book.quantityAvailable > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900 line-clamp-1">{book.title}</h3>
                  {isAdmin && (
                    <div className="relative group/menu">
                      <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                        <MoreVertical size={16} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-lg shadow-lg hidden group-hover/menu:block z-10 w-32">
                        <button 
                          onClick={() => {
                            setEditingBook(book);
                            setFormData({
                              title: book.title,
                              author: book.author,
                              isbn: book.isbn,
                              category: book.category || '',
                              publisher: book.publisher || '',
                              quantityTotal: book.quantityTotal,
                              shelfLocation: book.shelfLocation || '',
                              description: book.description || '',
                              coverImage: book.coverImage || '',
                            });
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center space-x-2"
                        >
                          <Edit size={14} />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteBook(book.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-sm mb-4">By {book.author}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <p>ISBN: {book.isbn}</p>
                    <p>Shelf: {book.shelfLocation || 'N/A'}</p>
                  </div>
                  {!isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestBook(book, book.quantityAvailable > 0 ? 'borrow' : 'request');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        book.quantityAvailable > 0 
                          ? 'bg-orange-500 text-white hover:bg-orange-600' 
                          : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                      }`}
                    >
                      {book.quantityAvailable > 0 ? 'Borrow' : 'Request'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Detail Modal for Students/Teachers */}
      {selectedBook && !isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="relative h-64 bg-slate-100">
              {selectedBook.coverImage ? (
                <img src={selectedBook.coverImage} alt={selectedBook.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <BookOpen size={80} />
                </div>
              )}
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedBook.title}</h2>
                  <p className="text-slate-500 font-medium">By {selectedBook.author}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedBook.quantityAvailable > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {selectedBook.quantityAvailable > 0 ? `${selectedBook.quantityAvailable} Available` : 'Out of Stock'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Category</p>
                  <p className="text-sm font-bold text-slate-700">{selectedBook.category || 'General'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Shelf Location</p>
                  <p className="text-sm font-bold text-slate-700">{selectedBook.shelfLocation || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ISBN</p>
                  <p className="text-sm font-bold text-slate-700">{selectedBook.isbn}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Publisher</p>
                  <p className="text-sm font-bold text-slate-700">{selectedBook.publisher || 'N/A'}</p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Description</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {selectedBook.description || 'No description available for this book.'}
                </p>
              </div>

              <button
                onClick={() => handleRequestBook(selectedBook, selectedBook.quantityAvailable > 0 ? 'borrow' : 'request')}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-orange-200 ${
                  selectedBook.quantityAvailable > 0 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {selectedBook.quantityAvailable > 0 ? 'Borrow This Book' : 'Request When Available'}
              </button>
            </div>
          </div>
        </div>
      )}
      {(showAddModal || editingBook) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingBook(null);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingBook ? handleUpdateBook : handleAddBook} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Book Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Author</label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">ISBN</label>
                  <input
                    type="text"
                    required
                    value={formData.isbn}
                    onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Total Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantityTotal}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, quantityTotal: isNaN(val) ? 0 : val});
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Shelf Location</label>
                  <input
                    type="text"
                    value={formData.shelfLocation}
                    onChange={(e) => setFormData({...formData, shelfLocation: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Book Cover Image</label>
                  <div className="flex items-center space-x-4">
                    {formData.coverImage && (
                      <img src={formData.coverImage} alt="Preview" className="w-12 h-16 object-cover rounded-lg border border-slate-200" />
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center w-full px-4 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl hover:bg-slate-100 transition-all">
                        {uploading ? (
                          <Loader2 className="animate-spin text-orange-500" size={20} />
                        ) : (
                          <span className="text-xs text-slate-500">Click to upload cover</span>
                        )}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Cover Image URL (Manual)</label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBook(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all"
                >
                  {editingBook ? 'Update Book' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;

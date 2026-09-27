const CrazySpinner = () => {
  return (
    <div className="fk:flex fk:items-center fk:justify-center fk:gap-0.5">
      <div className="fk:h-1.5 fk:w-1.5 fk:animate-bounce fk:rounded-full fk:bg-pink-500 [animation-delay:-0.3s] fk:corner-squircle" />
      <div className="fk:h-1.5 fk:w-1.5 fk:animate-bounce fk:rounded-full fk:bg-pink-600 [animation-delay:-0.15s] fk:corner-squircle" />
      <div className="fk:h-1.5 fk:w-1.5 fk:animate-bounce fk:rounded-full fk:bg-pink-600 fk:corner-squircle" />
    </div>
  );
};

export default CrazySpinner;
